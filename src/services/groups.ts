import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, addDoc,
  query, where, orderBy, onSnapshot, arrayUnion, arrayRemove,
  writeBatch, increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { getDisplayName } from '@/utils/userDisplay';

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: number;
  lastMessage: string;
  lastMessageTime: number;
}

/**
 * Groups are stored in the `groups` collection and ALSO mirrored into the
 * `conversations` collection (same doc id) so the chat list — which only
 * subscribes to `conversations` — shows groups alongside 1:1 chats with no
 * schema changes. 1:1 conversations keep their existing `uid1_uid2` ids.
 */
function groupConversationRef(groupId: string) {
  return doc(db, 'conversations', groupId);
}

async function syncGroupConversation(
  groupId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await setDoc(groupConversationRef(groupId), data, { merge: true }).catch(() => {});
}

export async function createGroup(
  name: string,
  memberIds: string[],
  description: string = '',
  icon: string = '',
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const groupId = `group_${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const allMembers = [...new Set([user.uid, ...memberIds])];
  const now = Date.now();

  await setDoc(doc(db, 'groups', groupId), {
    name,
    description,
    icon,
    members: allMembers,
    admins: [user.uid],
    createdBy: user.uid,
    createdAt: now,
    lastMessage: '',
    lastMessageTime: now,
  });

  await syncGroupConversation(groupId, {
    participants: allMembers,
    name,
    type: 'group',
    lastMessage: '',
    lastMessageTime: now,
    lastMessageSenderId: '',
    unreadCount: 0,
    unreadByUser: {},
    pinned: false,
    createdAt: now,
  });

  return groupId;
}

export function subscribeToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId),
  );

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Group[];
    callback(groups);
  });
}

export function subscribeToGroup(
  groupId: string,
  callback: (group: Group | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'groups', groupId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null);
  });
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
}

export async function addMembersToGroup(
  groupId: string,
  memberIds: string[],
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayUnion(...memberIds),
  });
  await syncGroupConversation(groupId, {
    participants: arrayUnion(...memberIds),
  });
}

export async function removeMemberFromGroup(
  groupId: string,
  memberId: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  if (!groupSnap.exists()) return;
  const group = groupSnap.data() as Group;

  if (!group.admins.includes(user.uid) && user.uid !== memberId) {
    throw new Error('Only admins can remove members');
  }

  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayRemove(memberId),
    admins: arrayRemove(memberId),
  });
  await syncGroupConversation(groupId, {
    participants: arrayRemove(memberId),
  });
}

export async function promoteToAdmin(
  groupId: string,
  memberId: string,
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    admins: arrayUnion(memberId),
  });
}

export async function demoteFromAdmin(
  groupId: string,
  memberId: string,
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    admins: arrayRemove(memberId),
  });
}

export async function updateGroup(
  groupId: string,
  data: Partial<Pick<Group, 'name' | 'description' | 'icon'>>,
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), data);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const msgsSnap = await getDocs(collection(db, 'groupMessages', groupId, 'messages'));
  const batch = writeBatch(db);
  msgsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'groups', groupId));
  batch.delete(doc(db, 'conversations', groupId));
  await batch.commit();
}

export async function sendGroupMessage(
  groupId: string,
  text: string,
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif' = 'text',
  mediaURL?: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const msgData: Record<string, unknown> = {
    groupId,
    senderId: user.uid,
    senderName: getDisplayName({ displayName: user.displayName, email: user.email, phone: user.phoneNumber }),
    text,
    createdAt: Date.now(),
    read: false,
    type,
    starred: false,
    deleted: false,
    forwarded: false,
  };
  if (mediaURL) msgData.mediaURL = mediaURL;

  const msgRef = await addDoc(collection(db, 'groupMessages', groupId, 'messages'), msgData);

  const preview = type === 'text' ? text : `📎 ${type}`;
  const ts = Date.now();

  // Bump the unread counter for every member except the sender so group
  // unread badges actually reflect new messages.
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  const members: string[] = groupSnap.exists()
    ? ((groupSnap.data() as Group).members || [])
    : [];
  const convPatch: Record<string, unknown> = {
    lastMessage: preview,
    lastMessageTime: ts,
    lastMessageSenderId: user.uid,
    unreadCount: increment(1),
  };
  members.forEach((memberId) => {
    if (memberId !== user.uid) {
      convPatch[`unreadByUser.${memberId}`] = increment(1);
    }
  });

  await Promise.all([
    updateDoc(doc(db, 'groups', groupId), {
      lastMessage: preview,
      lastMessageTime: ts,
    }),
    syncGroupConversation(groupId, convPatch),
  ]);

  return msgRef.id;
}

export function subscribeToGroupMessages(
  groupId: string,
  callback: (messages: Record<string, unknown>[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'groupMessages', groupId, 'messages'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(messages);
  });
}
