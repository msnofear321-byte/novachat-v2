import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import type { MusicStatus } from '@/types';

export async function saveMusicStatus(status: MusicStatus): Promise<void> {
  await setDoc(doc(db, 'musicStatus', status.userId), status);
}

export async function getMusicStatus(userId: string): Promise<MusicStatus | null> {
  const snap = await getDocs(query(collection(db, 'musicStatus'), where('userId', '==', userId), orderBy('updatedAt', 'desc'), limit(1)));
  return snap.docs.length ? (snap.docs[0].data() as MusicStatus) : null;
}
