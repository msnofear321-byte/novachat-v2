import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  query, where, orderBy, onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { getDisplayName } from '@/utils/userDisplay';
import type { User } from '@/types';

export type StoryPrivacy = 'everyone' | 'contacts' | 'selected' | 'nobody';

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaURL: string;
  type: 'image' | 'video';
  text?: string;
  createdAt: number;
  expiresAt: number;
  /** Viewers' uids (the story's seen list). */
  seenBy: string[];
  likes: string[];
  /** Who may view this story. Defaults to 'everyone' for legacy stories. */
  privacy?: StoryPrivacy;
  /** Uids explicitly allowed when privacy is 'selected'. */
  allowedUsers?: string[];
}

const STORY_DURATION = 24 * 60 * 60 * 1000;

/**
 * Whether `viewerUid` may see `story`. The owner always sees their own story.
 * For 'contacts' privacy the owner's contacts list must be supplied (it is not
 * resolved here because it lives on a separate user document).
 */
export function isStoryVisible(
  story: Pick<Story, 'userId' | 'privacy' | 'allowedUsers'>,
  viewerUid: string | null | undefined,
  ownerContacts?: string[] | null,
): boolean {
  if (!viewerUid) return false;
  if (story.userId === viewerUid) return true;

  switch (story.privacy || 'everyone') {
    case 'nobody':
      return false;
    case 'contacts':
      return Array.isArray(ownerContacts) && ownerContacts.includes(viewerUid);
    case 'selected':
      return Array.isArray(story.allowedUsers) && story.allowedUsers.includes(viewerUid);
    case 'everyone':
    default:
      return true;
  }
}

export async function uploadStory(
  mediaURL: string,
  type: 'image' | 'video',
  text?: string,
  privacy: StoryPrivacy = 'everyone',
  allowedUsers: string[] = [],
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const storyId = `${user.uid}_${Date.now()}`;
  const now = Date.now();

  await setDoc(doc(db, 'stories', storyId), {
    userId: user.uid,
    userName: getDisplayName(
      { displayName: user.displayName, email: user.email, phone: user.phoneNumber },
      'Me',
    ),
    userPhoto: user.photoURL || '',
    mediaURL,
    type,
    text: text || '',
    createdAt: now,
    expiresAt: now + STORY_DURATION,
    seenBy: [],
    likes: [],
    privacy,
    allowedUsers: privacy === 'selected' ? allowedUsers : [],
  });

  return storyId;
}

// Per-owner contacts cache used to resolve 'contacts'-privacy stories. Cached
// by promise so concurrent snapshots share a single document read.
const contactsCache = new Map<string, Promise<string[] | null>>();

function getOwnerContacts(ownerId: string): Promise<string[] | null> {
  let p = contactsCache.get(ownerId);
  if (!p) {
    p = getDoc(doc(db, 'users', ownerId))
      .then((snap) => {
        if (!snap.exists()) return null;
        const contacts = (snap.data() as Partial<User>).contacts;
        return Array.isArray(contacts) ? contacts : null;
      })
      .catch(() => null);
    contactsCache.set(ownerId, p);
  }
  return p;
}

/**
 * Subscribe to active, non-expired stories the current viewer is allowed to
 * see. Visibility is evaluated per viewer (own stories always, then the story's
 * privacy rule). 'contacts' privacy needs the owner's user doc, which is
 * fetched lazily and re-emitted once resolved. The 24h expiry is enforced by
 * the query (`expiresAt > now`); callers still tick their own clock to drop a
 * story from the UI at the exact moment it expires.
 */
export function subscribeToStories(
  callback: (stories: Story[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const now = Date.now();
  const q = query(
    collection(db, 'stories'),
    where('expiresAt', '>', now),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const stories = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Story[];
      const viewerUid = auth.currentUser?.uid;

      const contactOwners = new Set<string>();
      stories.forEach((s) => {
        if (viewerUid && s.userId !== viewerUid && (s.privacy || 'everyone') === 'contacts') {
          contactOwners.add(s.userId);
        }
      });

      const contactsResolved = new Map<string, string[] | null>();
      const emit = () => {
        if (!viewerUid) {
          callback([]);
          return;
        }
        const visible = stories.filter((s) =>
          isStoryVisible(
            s,
            viewerUid,
            contactOwners.has(s.userId) ? contactsResolved.get(s.userId) ?? null : null,
          ),
        );
        callback(visible);
      };

      const pending = [...contactOwners].map((ownerId) =>
        getOwnerContacts(ownerId).then((contacts) => {
          contactsResolved.set(ownerId, contacts);
        }),
      );

      if (pending.length === 0) {
        emit();
        return;
      }
      Promise.all(pending).then(emit).catch(emit);
    },
    (error) => {
      console.error('subscribeToStories onSnapshot error:', error);
      onError?.(error);
    },
  );
}

export async function markStorySeen(storyId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await getDoc(doc(db, 'stories', storyId));
  if (!snap.exists()) return;
  const data = snap.data() as Story;
  if (data.seenBy.includes(user.uid)) return;

  await setDoc(doc(db, 'stories', storyId), {
    seenBy: [...data.seenBy, user.uid],
  }, { merge: true });
}

/**
 * The users who viewed a story, with their real display names resolved from
 * the users collection (falls back to the raw uid when a doc is unavailable).
 */
export async function getSeenList(storyId: string): Promise<{ uid: string; name: string }[]> {
  const snap = await getDoc(doc(db, 'stories', storyId));
  if (!snap.exists()) return [];
  const data = snap.data() as Story;
  const uids = data.seenBy || [];
  if (uids.length === 0) return [];

  const byUid = new Map<string, User>();
  try {
    const seenUsers = await getDocs(
      query(collection(db, 'users'), where('uid', 'in', uids.slice(0, 10))),
    );
    seenUsers.docs.forEach((d) => {
      const u = d.data() as User;
      byUid.set(u.uid, u);
    });
  } catch {
    // Fall back to raw uids if the lookup fails.
  }

  return uids.map((uid) => {
    const u = byUid.get(uid);
    return { uid, name: u ? getDisplayName(u) : uid };
  });
}

/**
 * Reply to a story by sending a message to the author's existing (or newly
 * created) 1:1 conversation. Uses the canonical conversation id scheme so
 * replies never create duplicate or legacy `_`-scheme conversations.
 */
export async function replyToStory(
  storyUserId: string,
  text: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const { createConversation, sendMessage } = await import('./firestore');
  const conversationId = await createConversation(storyUserId);

  await sendMessage(conversationId, {
    conversationId,
    senderId: user.uid,
    receiverId: storyUserId,
    text,
    createdAt: Date.now(),
    read: false,
    delivered: false,
    type: 'text',
    starred: false,
    deleted: false,
    forwarded: false,
  });
}

export async function deleteStory(storyId: string): Promise<void> {
  await deleteDoc(doc(db, 'stories', storyId));
}

export async function likeStory(storyId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await getDoc(doc(db, 'stories', storyId));
  if (!snap.exists()) return;
  const data = snap.data() as Story;
  if (data.likes.includes(user.uid)) return;
  await setDoc(doc(db, 'stories', storyId), {
    likes: [...data.likes, user.uid],
  }, { merge: true });
}

export async function unlikeStory(storyId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await getDoc(doc(db, 'stories', storyId));
  if (!snap.exists()) return;
  const data = snap.data() as Story;
  await setDoc(doc(db, 'stories', storyId), {
    likes: data.likes.filter((uid) => uid !== user.uid),
  }, { merge: true });
}
