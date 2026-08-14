import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '@/types';

/**
 * Shared, ref-counted user-profile resolver.
 *
 * Every profile is keyed by its Firestore *document id* (the Firebase auth
 * UID) — the only identity key NovaChat uses. Many components (ChatList,
 * ChatPage, search) share ONE onSnapshot per uid, so a profile is never
 * fetched twice and profile edits (name/photo) propagate everywhere in
 * realtime. A one-shot getDoc fallback guarantees a row resolves even when a
 * snapshot listener is slow or fails, so names never stay blank.
 */

type UserListener = (user: User | undefined) => void;

const cache = new Map<string, User | undefined>();
const listeners = new Map<string, Set<UserListener>>();
const activeListeners = new Map<string, () => void>();
const fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>();

function emit(uid: string, user: User | undefined): void {
  cache.set(uid, user);
  listeners.get(uid)?.forEach((cb) => cb(user));
}

function fetchOnce(uid: string): void {
  getDoc(doc(db, 'users', uid))
    .then((snap) => emit(uid, snap.exists() ? (snap.data() as User) : undefined))
    .catch((err) => {
      console.error(`userResolver: getDoc failed for ${uid}:`, err);
    });
}

function ensureListening(uid: string): void {
  if (activeListeners.has(uid)) return;

  const unsub = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (fallbackTimers.has(uid)) {
        clearTimeout(fallbackTimers.get(uid)!);
        fallbackTimers.delete(uid);
      }
      emit(uid, snap.exists() ? (snap.data() as User) : undefined);
    },
    (error) => {
      console.error(`userResolver: onSnapshot failed for ${uid}:`, error);
      if (!fallbackTimers.has(uid)) {
        fallbackTimers.set(
          uid,
          setTimeout(() => {
            fallbackTimers.delete(uid);
            fetchOnce(uid);
          }, 250),
        );
      }
    },
  );
  activeListeners.set(uid, unsub);

  // If the snapshot hasn't delivered within 1.5s, resolve via a one-shot read
  // so a dropped listener never leaves the row blank.
  fallbackTimers.set(
    uid,
    setTimeout(() => {
      fallbackTimers.delete(uid);
      if (!cache.has(uid) || cache.get(uid) === undefined) fetchOnce(uid);
    }, 1500),
  );
}

function stopListening(uid: string): void {
  activeListeners.get(uid)?.();
  activeListeners.delete(uid);
  if (fallbackTimers.has(uid)) {
    clearTimeout(fallbackTimers.get(uid)!);
    fallbackTimers.delete(uid);
  }
  listeners.delete(uid);
}

/** Synchronous view of the last known profile for a uid (may be undefined). */
export function getCachedUserProfile(uid: string): User | undefined {
  return cache.get(uid);
}

/**
 * Subscribe to realtime profile updates for a uid. Returns an unsubscribe
 * function. The first subscriber starts the shared listener; the last one to
 * unsubscribe stops it. The cached profile (if any) is re-emitted to new
 * subscribers so remounts render names instantly.
 */
export function subscribeUserProfile(uid: string, cb: UserListener): () => void {
  if (!uid) return () => {};

  const set = listeners.get(uid) ?? new Set<UserListener>();
  if (set.size === 0) ensureListening(uid);
  set.add(cb);
  listeners.set(uid, set);

  if (cache.has(uid)) {
    queueMicrotask(() => {
      if (listeners.get(uid)?.has(cb)) cb(cache.get(uid));
    });
  }

  return () => {
    const current = listeners.get(uid);
    if (!current) return;
    current.delete(cb);
    if (current.size === 0) stopListening(uid);
  };
}
