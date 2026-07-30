import {
  collection, doc, setDoc, getDoc, deleteDoc, onSnapshot, query, orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export interface MusicNote {
  userId: string;
  userName: string;
  userPhoto: string;
  songName: string;
  artist: string;
  audioURL: string;
  coverURL: string;
  updatedAt: number;
}

export function subscribeMusicNotes(
  callback: (notes: MusicNote[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'musicNotes'),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map((d) => d.data() as MusicNote);
    callback(notes);
  });
}

export async function upsertMusicNote(note: MusicNote): Promise<void> {
  await setDoc(doc(db, 'musicNotes', note.userId), note);
}

export async function getMusicNote(userId: string): Promise<MusicNote | null> {
  const snap = await getDoc(doc(db, 'musicNotes', userId));
  if (!snap.exists()) return null;
  return snap.data() as MusicNote;
}

export async function deleteMusicNote(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'musicNotes', userId));
}
