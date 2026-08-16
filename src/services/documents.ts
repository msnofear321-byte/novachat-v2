import { auth, db, storage } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { UserDocument, DocumentCategory } from '@/types';

/**
 * Private Personal Documents service.
 *
 * Files are stored ONLY in Firebase Storage under `documents/{uid}/{docId}`
 * (enforced by `storage.rules`) and the owning document id is never exposed
 * as a public URL — no Cloudinary public URLs are used here. Firestore
 * metadata lives at `documents/{uid}/files/{docId}` and is readable/writable
 * only by the owner (see `firestore.rules`).
 */

function getDocsRef() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return collection(db, 'documents', user.uid, 'files');
}

function getDocRef(docId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return doc(db, 'documents', user.uid, 'files', docId);
}

/** Upload a private document file. Returns the storage path (never a URL). */
export async function uploadDocumentFile(
  file: File,
  docId: string,
  onProgress?: (percent: number) => void,
): Promise<{ storagePath: string; mimeType: string; fileSize: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const path = `documents/${user.uid}/${docId}`;
  const mimeType = file.type || 'application/octet-stream';
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: mimeType });
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(snap.totalBytes > 0 ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0),
      reject,
      () => resolve({ storagePath: path, mimeType, fileSize: file.size }),
    );
  });
}

/** Fetch a temporary download URL for a stored document (owner-only). */
export async function getDocumentDownloadUrl(storagePath: string): Promise<string> {
  return getDownloadURL(ref(storage, storagePath));
}

/** Permanently remove the stored file. */
export async function deleteDocumentFile(storagePath: string) {
  await deleteObject(ref(storage, storagePath));
}

export function subscribeDocuments(
  callback: (documents: UserDocument[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const q = query(getDocsRef(), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const documents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserDocument));
      callback(documents);
    },
    (err) => onError?.(err),
  );
}

export async function createDocument(
  data: Omit<UserDocument, 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const docRef = doc(getDocsRef(), data.id);
  await setDoc(docRef, {
    ...data,
    ownerId: user.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return data.id;
}

export async function updateDocument(
  docId: string,
  data: Partial<Pick<UserDocument, 'name' | 'category'>>,
) {
  const ref = getDocRef(docId);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteDocument(docId: string, storagePath: string) {
  try {
    await deleteDocumentFile(storagePath);
  } catch (e) {
    console.error('Failed to delete document file:', e);
  }
  await deleteDoc(getDocRef(docId));
}

export type { DocumentCategory };
