import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { normalizePhone } from '@/utils/phone';
import type { User, Conversation, Message } from '@/types';

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) delete obj[key];
  });
  return obj;
}

/**
 * Deterministic id for a 1:1 conversation.
 *
 * `|` is used instead of `_` because Firebase auth uids are base64url strings
 * that frequently contain `_` (and Google uids are plain numbers). Splitting a
 * `_`-joined id never worked, and it could even collide across user pairs.
 * The `|` character cannot appear in any auth uid, so ids are unambiguous.
 */
function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('|');
}

export { getConversationId };

/**
 * Some conversations were created before the id scheme switched from `_` to
 * `|`. Given two participants, look for an existing conversation doc between
 * them so we reuse it instead of creating a duplicate.
 */
async function findExistingConversation(
  uid1: string,
  uid2: string,
): Promise<string | null> {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid1),
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const parts = d.data().participants as string[] | undefined;
      if (Array.isArray(parts) && parts.includes(uid1) && parts.includes(uid2)) {
        return d.id;
      }
    }
  } catch {
    // Fall back to the canonical id if the lookup fails.
  }
  return null;
}

/**
 * Resolve the conversation id to use between two users: the canonical (`|`)
 * id when it already exists, otherwise any legacy `_`-scheme conversation.
 */
export async function resolveConversationId(uid1: string, uid2: string): Promise<string> {
  const canonical = getConversationId(uid1, uid2);
  const legacy = await findExistingConversation(uid1, uid2);
  return legacy ?? canonical;
}

// ── Users ─────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, limit(50));
  const snapshot = await getDocs(q);
  // The Firebase auth UID is the document id — the only identity key. Derive
  // it from `d.id` (never trust a `uid` field inside the doc, which legacy
  // documents may be missing) so tapping a user always opens the right chat.
  return snapshot.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as User)
    .filter((u) => u.uid !== auth.currentUser?.uid);
}

export async function searchUsers(searchTerm: string): Promise<User[]> {
  const term = searchTerm.trim();
  if (!term) return [];
  const lower = term.toLowerCase();
  // Phone numbers are matched on their normalized digit form so `+91 98765 43210`
  // still finds a user stored as `09876543210` (see utils/phone.ts).
  const phoneTerm = normalizePhone(term);
  const usersRef = collection(db, 'users');
  const currentUid = auth.currentUser?.uid;

  // Fast indexed prefix queries plus a broad un-indexed fetch. Results are
  // merged and re-filtered case-insensitively so typing "john" still finds
  // "John" and "john@example.com". Every query is caught individually so one
  // failure (e.g. a missing index) never blanks the whole search.
  const queries = [
    query(usersRef, where('displayName', '>=', term), where('displayName', '<=', term + '\uf8ff'), limit(50)),
    query(usersRef, where('email', '>=', term), where('email', '<=', term + '\uf8ff'), limit(50)),
    query(usersRef, limit(200)),
  ];

  const snapshots = await Promise.all(queries.map((q) => getDocs(q).catch(() => null)));
  const byUid = new Map<string, User>();
  snapshots.forEach((snap) => {
    if (!snap) return;
    snap.docs.forEach((d) => {
      // UID is the document id (canonical identity); don't trust the field.
      const u = { uid: d.id, ...(d.data() as User) };
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const uid = (u.uid || '').toLowerCase();
      const phone = u.phone ? normalizePhone(u.phone) : '';
      const matches =
        name.includes(lower) ||
        email.includes(lower) ||
        (uid && uid.includes(lower)) ||
        (phone && phone.includes(phoneTerm));
      if (u.uid && u.uid !== currentUid && matches) {
        byUid.set(u.uid, u);
      }
    });
  });

  const results = [...byUid.values()];
  // Exact phone matches win, so dialing a full number surfaces that user first.
  if (phoneTerm) {
    results.sort((a, b) => {
      const aExact = a.phone ? normalizePhone(a.phone) === phoneTerm : false;
      const bExact = b.phone ? normalizePhone(b.phone) === phoneTerm : false;
      if (aExact !== bExact) return aExact ? -1 : 1;
      return 0;
    });
  }
  return results.slice(0, 20);
}

export async function getUserById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as User) : null;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<User>,
): Promise<void> {
  return updateDoc(doc(db, 'users', uid), stripUndefined({ ...data } as Record<string, unknown>));
}

// ── Conversations ─────────────────────────────────────────

const CONV_CACHE_KEY = 'nova_conversations_cache';
const CONV_CACHE_TTL = 5 * 60 * 1000;

function getCachedConversations(uid: string): Conversation[] | null {
  try {
    const raw = localStorage.getItem(CONV_CACHE_KEY);
    if (!raw) return null;
    const { uid: cachedUid, timestamp, data } = JSON.parse(raw);
    if (cachedUid !== uid || Date.now() - timestamp > CONV_CACHE_TTL) return null;
    return data as Conversation[];
  } catch {
    return null;
  }
}

function setCachedConversations(uid: string, conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONV_CACHE_KEY, JSON.stringify({
      uid,
      timestamp: Date.now(),
      data: conversations,
    }));
  } catch {}
}

export async function createConversation(otherUserId: string): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');
  if (!otherUserId) throw new Error('Invalid user');

  const canonicalId = getConversationId(currentUser.uid, otherUserId);

  // Reuse an existing conversation (canonical `|` id, or a legacy `_` id that
  // predates the id scheme change) so a pair never ends up with two chats.
  const conversationId = await resolveConversationId(currentUser.uid, otherUserId);
  if (conversationId !== canonicalId) return conversationId;

  const convRef = doc(db, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);

  if (convSnap.exists()) return conversationId;

  await setDoc(convRef, {
    participants: [currentUser.uid, otherUserId],
    lastMessage: '',
    lastMessageTime: Date.now(),
    lastMessageSenderId: '',
    unreadCount: 0,
    unreadByUser: {},
    pinned: false,
    createdAt: Date.now(),
  });

  return conversationId;
}

export function subscribeToConversations(
  callback: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const currentUser = auth.currentUser;
  if (!currentUser) return () => {};

  const uid = currentUser.uid;

  const cached = getCachedConversations(uid);
  if (cached) callback(cached);

  let cancelled = false;
  let retryTimeout: ReturnType<typeof setTimeout> | undefined;
  let retryCount = 0;
  const MAX_RETRIES = 5;
  let currentUnsub: Unsubscribe | null = null;

  function subscribe(): Unsubscribe {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        retryCount = 0;
        const conversations = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Conversation[];

        const sorted = [...conversations].sort((a, b) => {
          const aTime = typeof a.lastMessageTime === 'number' ? a.lastMessageTime : 0;
          const bTime = typeof b.lastMessageTime === 'number' ? b.lastMessageTime : 0;
          return bTime - aTime;
        });

        setCachedConversations(uid, sorted);
        callback(sorted);
      },
      (error) => {
        console.error('subscribeToConversations error:', error);
        onError?.(error);

        if (!cancelled && retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 16000);
          console.log(`Retrying subscribeToConversations in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})...`);
          retryTimeout = setTimeout(() => {
            if (!cancelled) {
              currentUnsub?.();
              currentUnsub = subscribe();
            }
          }, delay);
        }
      },
    );
  }

  currentUnsub = subscribe();

  return () => {
    cancelled = true;
    clearTimeout(retryTimeout);
    currentUnsub?.();
  };
}

export async function togglePinConversation(
  conversationId: string,
  pinned: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), { pinned });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const msgsRef = collection(db, 'messages', conversationId, 'messages');
  const msgsSnap = await getDocs(msgsRef);
  const BATCH_LIMIT = 499;
  for (let i = 0; i < msgsSnap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = msgsSnap.docs.slice(i, i + BATCH_LIMIT);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'conversations', conversationId));
}

// ── Messages ──────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  message: Omit<Message, 'id'>,
): Promise<string> {
  const msgData = stripUndefined({ ...message });

  const msgRef = collection(db, 'messages', conversationId, 'messages');
  const docRef = await addDoc(msgRef, msgData);

  try {
    const patch: Record<string, unknown> = {
      lastMessage: message.type === 'text' ? message.text : `📎 ${message.type}`,
      lastMessageTime: message.createdAt,
      lastMessageSenderId: message.senderId,
      unreadCount: increment(1),
    };
    // Track unread per recipient so one user reading a chat never clears the
    // other user's badge.
    if (message.receiverId) {
      patch[`unreadByUser.${message.receiverId}`] = increment(1);
    }
    await updateDoc(doc(db, 'conversations', conversationId), patch);
  } catch (err) {
    console.warn('Failed to update conversation metadata (message still saved):', err);
  }

  return docRef.id;
}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const userId = auth.currentUser?.uid;

  const q = query(
    collection(db, 'messages', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Message[];

      const filtered = userId
        ? messages.filter((m) => {
            if (m.deletedForEveryone) return false;
            if (m.deletedBy && m.deletedBy.includes(userId)) return false;
            return true;
          })
        : messages;

      callback(filtered);
    },
    (error) => {
      console.error('subscribeToMessages onSnapshot error:', error);
      onError?.(error);
    },
  );
}

export async function markMessagesAsRead(
  conversationId: string,
): Promise<void> {
  try {
    const uid = auth.currentUser?.uid;
    const q = query(
      collection(db, 'messages', conversationId, 'messages'),
      where('read', '==', false),
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { read: true, delivered: true });
    });
    const convPatch: Record<string, unknown> = { unreadCount: 0 };
    if (uid) convPatch[`unreadByUser.${uid}`] = 0;
    batch.update(doc(db, 'conversations', conversationId), convPatch);
    await batch.commit();
  } catch (error) {
    console.error('markMessagesAsRead failed:', error);
  }
}

export async function markMessagesAsDelivered(
  conversationId: string,
): Promise<void> {
  try {
    const q = query(
      collection(db, 'messages', conversationId, 'messages'),
      where('delivered', '==', false),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { delivered: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('markMessagesAsDelivered failed:', error);
  }
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  newText: string,
): Promise<void> {
  await updateDoc(
    doc(db, 'messages', conversationId, 'messages', messageId),
    { text: newText, edited: true, editedAt: Date.now() },
  );
}

/**
 * Delete for Me – hides the message only for the current user.
 * Other user still sees it. Persists after refresh.
 */
export async function deleteMessageForMe(
  conversationId: string,
  messageId: string,
): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  await updateDoc(
    doc(db, 'messages', conversationId, 'messages', messageId),
    { deletedBy: arrayUnion(userId) },
  );
}

/**
 * Delete for Everyone – allowed only within 15 minutes.
 * Replaces message text and marks it deleted globally.
 * Attempts to clean up Cloudinary media when appropriate.
 */
export async function deleteMessageForEveryone(
  conversationId: string,
  messageId: string,
  message: Message,
): Promise<{ success: boolean; error?: string }> {
  const userId = auth.currentUser?.uid;
  if (!userId) return { success: false, error: 'Not authenticated' };

  if (message.senderId !== userId) {
    return { success: false, error: 'You can only delete your own messages for everyone' };
  }

  const fifteenMinutes = 15 * 60 * 1000;
  if (Date.now() - message.createdAt > fifteenMinutes) {
    return { success: false, error: 'Messages can only be deleted within 15 minutes' };
  }

  try {
    const deleteText = message.senderId === userId
      ? 'You deleted this message.'
      : 'This message was deleted.';

    await updateDoc(
      doc(db, 'messages', conversationId, 'messages', messageId),
      {
        deleted: true,
        deletedForEveryone: true,
        text: deleteText,
        type: 'text',
        mediaURL: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        duration: null,
      },
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete' };
  }
}

/**
 * Legacy deleteMessage – now delegates to deleteMessageForEveryone
 * for backward compatibility.
 */
export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  await deleteMessageForMe(conversationId, messageId);
}

export async function starMessage(
  conversationId: string,
  messageId: string,
  starred: boolean,
): Promise<void> {
  await updateDoc(
    doc(db, 'messages', conversationId, 'messages', messageId),
    { starred },
  );
}

/**
 * Toggle a reaction emoji on a message for the current user. Reactions are
 * stored as a map of emoji -> uid array, updated atomically via a transaction
 * so concurrent reacts never clobber each other.
 */
export async function toggleReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  const msgRef = doc(db, 'messages', conversationId, 'messages', messageId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(msgRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const reactions: Record<string, string[]> =
      (data?.reactions as Record<string, string[]> | undefined) || {};

    const current = reactions[emoji] || [];
    const hasReacted = current.includes(userId);

    if (hasReacted) {
      const next = current.filter((id) => id !== userId);
      if (next.length > 0) {
        tx.update(msgRef, { [`reactions.${emoji}`]: next });
      } else {
        tx.update(msgRef, { [`reactions.${emoji}`]: [] });
      }
    } else {
      tx.update(msgRef, { [`reactions.${emoji}`]: [...current, userId] });
    }
  });
}

/** Pin / unpin a message. */
export async function pinMessage(
  conversationId: string,
  messageId: string,
  pinned: boolean,
): Promise<void> {
  await updateDoc(
    doc(db, 'messages', conversationId, 'messages', messageId),
    { pinned },
  );
}

/**
 * Copy a message from one conversation to another.
 * Creates a forwarded copy preserving media, type, and metadata.
 */
export async function copyMessageToConversation(
  sourceMessage: Message,
  targetConversationId: string,
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  const targetConvSnap = await getDoc(doc(db, 'conversations', targetConversationId));
  if (!targetConvSnap.exists()) throw new Error('Target conversation not found');

  const targetConv = targetConvSnap.data() as Conversation;
  const receiverId = targetConv.participants.find((p) => p !== currentUser.uid) || '';

  const msgData: Record<string, unknown> = {
    conversationId: targetConversationId,
    senderId: currentUser.uid,
    receiverId,
    text: sourceMessage.text,
    createdAt: Date.now(),
    read: false,
    delivered: false,
    type: sourceMessage.type,
    starred: false,
    deleted: false,
    forwarded: true,
  };

  if (sourceMessage.mediaURL) msgData.mediaURL = sourceMessage.mediaURL;
  if (sourceMessage.fileName) msgData.fileName = sourceMessage.fileName;
  if (sourceMessage.fileSize) msgData.fileSize = sourceMessage.fileSize;
  if (sourceMessage.mimeType) msgData.mimeType = sourceMessage.mimeType;
  if (sourceMessage.duration) msgData.duration = sourceMessage.duration;

  return sendMessage(targetConversationId, msgData as Omit<Message, 'id'>);
}

// ── Typing ────────────────────────────────────────────────

export async function setTypingStatus(
  userId: string,
  conversationId: string,
  active: boolean,
): Promise<void> {
  await setDoc(
    doc(db, 'typing', userId),
    {
      [conversationId]: {
        active,
        timestamp: Date.now(),
      },
    },
    { merge: true },
  );
}

export function subscribeToTypingStatus(
  userId: string,
  conversationId: string,
  callback: (typing: boolean) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'typing', userId), (snap) => {
    const data = snap.data();
    if (data && data[conversationId]) {
      const isTyping = data[conversationId].active;
      const ts = data[conversationId].timestamp;
      const within5s = Date.now() - ts < 5000;
      callback(isTyping && within5s);
    } else {
      callback(false);
    }
  });
}

// ── Presence ──────────────────────────────────────────────

// Presence is written ONLY by the authenticated user's own session
// (src/services/presence.ts) via `online: boolean` + server timestamps, and
// read back here. Clients never force other users online.

export function subscribeToUserPresence(
  userId: string,
  callback: (user: User | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    callback(snap.exists() ? (snap.data() as User) : null);
  });
}

// ── Chat Actions ────────────────────────────────────────────

export async function clearChat(conversationId: string): Promise<void> {
  const msgsRef = collection(db, 'messages', conversationId, 'messages');
  const msgsSnap = await getDocs(msgsRef);
  const BATCH_LIMIT = 499;
  for (let i = 0; i < msgsSnap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = msgsSnap.docs.slice(i, i + BATCH_LIMIT);
    chunk.forEach((d) => batch.delete(d.ref));
    if (i + BATCH_LIMIT >= msgsSnap.docs.length) {
      batch.update(doc(db, 'conversations', conversationId), {
        lastMessage: '',
        lastMessageTime: Date.now(),
        lastMessageSenderId: '',
        unreadCount: 0,
        unreadByUser: {},
      });
    }
    await batch.commit();
  }
  if (msgsSnap.docs.length === 0) {
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: '',
      lastMessageTime: Date.now(),
      lastMessageSenderId: '',
      unreadCount: 0,
      unreadByUser: {},
    });
  }
}

export async function toggleMuteConversation(
  conversationId: string,
  muted: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), { muted });
}

export async function toggleArchiveConversation(
  conversationId: string,
  archived: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), { archived });
}

export async function blockUser(userId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const convId = await resolveConversationId(currentUser.uid, userId);
  await Promise.all([
    setDoc(doc(db, 'blocked', currentUser.uid), { blockedUsers: arrayUnion(userId) }, { merge: true }),
    updateDoc(doc(db, 'conversations', convId), { blocked: true }).catch(() => {}),
  ]);
}

export async function unblockUser(userId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const convId = await resolveConversationId(currentUser.uid, userId);
  await Promise.all([
    setDoc(doc(db, 'blocked', currentUser.uid), { blockedUsers: arrayRemove(userId) }, { merge: true }),
    updateDoc(doc(db, 'conversations', convId), { blocked: false }).catch(() => {}),
  ]);
}

export function subscribeToBlockedStatus(userId: string, callback: (blocked: string[]) => void): Unsubscribe {
  const ref = doc(db, 'blocked', userId);
  return onSnapshot(ref, (snap) => {
    const data = snap.data();
    callback(data?.blockedUsers || []);
  });
}

export async function reportUser(userId: string, reason: string): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    reporterId: auth.currentUser?.uid,
    reportedUserId: userId,
    reason,
    createdAt: Date.now(),
  });
}

export async function getStarredMessages(conversationId: string): Promise<Message[]> {
  const q = query(
    collection(db, 'messages', conversationId, 'messages'),
    where('starred', '==', true),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);
}

/**
 * Fetch every message in a conversation (ascending). Used by the
 * Media / Files / Links browser in the chat menu.
 */
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const q = query(
    collection(db, 'messages', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  const snapshot = await getDocs(q);
  const currentUid = auth.currentUser?.uid;
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Message)
    .filter((m) => {
      if (m.deletedForEveryone) return false;
      if (m.deleted && m.deletedBy && currentUid && m.deletedBy.includes(currentUid)) return false;
      return true;
    });
}

export async function exportChat(conversationId: string): Promise<string> {
  const q = query(
    collection(db, 'messages', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  const snapshot = await getDocs(q);
  const lines: string[] = [];
  for (const d of snapshot.docs) {
    const msg = d.data() as Message;
    const time = new Date(msg.createdAt).toLocaleString();
    const sender = msg.senderId === auth.currentUser?.uid ? 'You' : 'Them';
    const text = msg.deleted ? '[deleted]' : msg.text || `[${msg.type}]`;
    lines.push(`[${time}] ${sender}: ${text}`);
  }
  return lines.join('\n');
}
