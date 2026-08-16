import { doc, setDoc, deleteDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * A 24-hour temporary "note" (status-style). There is exactly one active note
 * per user, stored as a single document at `notes/{userId}` — creating a new
 * note replaces the previous one, so the collection never holds duplicates.
 */
export interface ChatNote {
  userId: string;
  text: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

/** Notes live for exactly 24 hours from creation. */
export const NOTE_TTL_MS = 24 * 60 * 60 * 1000;

export const NOTE_MAX_LENGTH = 120;

function noteRef(userId: string) {
  return doc(db, 'notes', userId);
}

/**
 * Accepts epoch numbers or Firestore Timestamps. Notes store plain epoch ms
 * (same convention as stories) so `expiresAt` arithmetic stays exact and a
 * client timestamp can never disagree with the stored value.
 */
function toMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const v = value as { seconds?: unknown; nanoseconds?: unknown };
    const seconds = typeof v.seconds === 'number' ? v.seconds : 0;
    const nanos = typeof v.nanoseconds === 'number' ? v.nanoseconds : 0;
    if (seconds > 0 || nanos > 0) return Math.floor(seconds * 1000 + nanos / 1_000_000);
  }
  return 0;
}

/** A note is visible only while its `expiresAt` is still in the future. */
export function isNoteActive(note: ChatNote | null | undefined, now = Date.now()): boolean {
  return !!note && !!note.expiresAt && note.expiresAt > now;
}

/** Create or replace the current user's note. */
export async function setMyNote(text: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const clean = text.trim().slice(0, NOTE_MAX_LENGTH);
  if (!clean) throw new Error('Note cannot be empty');
  const now = Date.now();
  await setDoc(noteRef(user.uid), {
    userId: user.uid,
    text: clean,
    createdAt: now,
    expiresAt: now + NOTE_TTL_MS,
  });
}

/** Delete the current user's note. */
export async function deleteMyNote(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await deleteDoc(noteRef(user.uid));
}

/**
 * Realtime subscription to a user's note. Missing, empty or expired notes
 * resolve to `null` so the UI never renders a stale note. When the expired
 * note belongs to the current user it is also deleted best-effort (expired
 * notes must not linger in the database).
 */
export function subscribeToNote(
  userId: string,
  callback: (note: ChatNote | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  if (!userId) return () => {};
  return onSnapshot(
    noteRef(userId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data() as Partial<ChatNote>;
      const note: ChatNote = {
        userId: data.userId || userId,
        text: data.text || '',
        createdAt: toMillis(data.createdAt),
        expiresAt: toMillis(data.expiresAt),
      };
      if (!note.text || !isNoteActive(note)) {
        if (note.userId === auth.currentUser?.uid) {
          deleteMyNote().catch(() => {});
        }
        callback(null);
        return;
      }
      callback(note);
    },
    (error) => {
      console.error('subscribeToNote error:', error);
      onError?.(error);
      callback(null);
    },
  );
}

/** Realtime subscription to the current user's own note. */
export function subscribeToMyNote(callback: (note: ChatNote | null) => void, onError?: (error: unknown) => void): Unsubscribe {
  const user = auth.currentUser;
  if (!user) return () => {};
  return subscribeToNote(user.uid, callback, onError);
}

/** Human-friendly countdown, e.g. "7h 24m" or "23m". */
export function formatExpiresIn(expiresAt: number, now = Date.now()): string {
  const left = expiresAt - now;
  if (left <= 0) return 'expires now';
  const totalMin = Math.floor(left / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
