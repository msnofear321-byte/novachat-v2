import { auth, db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Note } from '@/types';

function getNotesRef() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return collection(db, 'notes', user.uid, 'items');
}

function getNoteRef(noteId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return doc(db, 'notes', user.uid, 'items', noteId);
}

export function subscribeNotes(callback: (notes: Note[]) => void): Unsubscribe {
  const ref = getNotesRef();
  const q = query(ref, orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
    callback(notes);
  });
}

export async function createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = getNotesRef();
  const docRef = await addDoc(ref, {
    ...note,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function updateNote(noteId: string, data: Partial<Note>) {
  const ref = getNoteRef(noteId);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteNote(noteId: string) {
  const ref = getNoteRef(noteId);
  await deleteDoc(ref);
}
