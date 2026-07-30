import {
  collection, doc, setDoc, getDoc, deleteDoc,
  query, where, orderBy, onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';

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
  seenBy: string[];
  likes: string[];
}

const STORY_DURATION = 24 * 60 * 60 * 1000;

export async function uploadStory(mediaURL: string, type: 'image' | 'video', text?: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const storyId = `${user.uid}_${Date.now()}`;
  const now = Date.now();

  await setDoc(doc(db, 'stories', storyId), {
    userId: user.uid,
    userName: user.displayName || 'Unknown',
    userPhoto: user.photoURL || '',
    mediaURL,
    type,
    text: text || '',
    createdAt: now,
    expiresAt: now + STORY_DURATION,
    seenBy: [],
    likes: [],
  });

  return storyId;
}

export function subscribeToStories(
  callback: (stories: Story[]) => void,
): Unsubscribe {
  const now = Date.now();
  const q = query(
    collection(db, 'stories'),
    where('expiresAt', '>', now),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(q, (snapshot) => {
    const stories = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Story[];
    callback(stories);
  });
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

export async function getSeenList(storyId: string): Promise<{ uid: string; name: string }[]> {
  const snap = await getDoc(doc(db, 'stories', storyId));
  if (!snap.exists()) return [];
  const data = snap.data() as Story;
  return data.seenBy.map((uid) => ({ uid, name: uid }));
}

export async function replyToStory(
  storyId: string,
  storyUserId: string,
  text: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const conversationId = [user.uid, storyUserId].sort().join('_');

  const convSnap = await getDoc(doc(db, 'conversations', conversationId));
  if (!convSnap.exists()) {
    await setDoc(doc(db, 'conversations', conversationId), {
      participants: [user.uid, storyUserId],
      lastMessage: '',
      lastMessageTime: Date.now(),
      lastMessageSenderId: '',
      unreadCount: 0,
      pinned: false,
      createdAt: Date.now(),
    });
  }

  const { sendMessage } = await import('./firestore');
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
