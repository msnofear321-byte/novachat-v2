import { doc, deleteField, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '@/types';

// Heartbeat cadence: we re-stamp `lastActive` every 20s while the app is
// visible/online. A reader treats a user as offline once `lastActive` is older
// than PRESENCE_STALE_MS (40s), so a lost "offline" write (kill-switch, crash,
// frozen tab) can never leave anyone stuck online.
export const HEARTBEAT_INTERVAL_MS = 20000;
export const PRESENCE_STALE_MS = 40000;
// Client-side re-check cadence so green dots drop shortly after going stale.
export const PRESENCE_TICK_MS = 5000;

let currentUid: string | null = null;
let active = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// ── Writer ──────────────────────────────────────────────────

function writePresence(uid: string, payload: Record<string, unknown>): void {
  if (!uid) return;
  // Best effort: a failed write is fine — either the next heartbeat resyncs it,
  // or the reader-side staleness check handles it (never a fake "online").
  void setDoc(doc(db, 'users', uid), payload, { merge: true }).catch(() => {});
}

/**
 * Mark a user as actively online. `lastActive` is a server timestamp so the
 * heartbeat freshness is judged by the server clock, not the client's. The
 * legacy `status` field (which was the source of fake "always online") is
 * deleted here so old documents are migrated away on their next presence write.
 */
export function setUserOnline(uid: string): void {
  writePresence(uid, {
    online: true,
    lastSeen: serverTimestamp(),
    lastActive: serverTimestamp(),
    status: deleteField(),
  });
}

/**
 * Mark a user offline immediately with a server-timestamped `lastSeen`.
 */
export function setUserOffline(uid: string): void {
  writePresence(uid, {
    online: false,
    lastSeen: serverTimestamp(),
  });
}

// ── Reader ──────────────────────────────────────────────────

/**
 * Normalize a Firestore `Timestamp`, a raw `{ seconds, nanoseconds }` object,
 * or a legacy numeric epoch into milliseconds. Returns 0 when unknown.
 */
export function presenceMillis(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    const v = value as { seconds?: unknown; nanoseconds?: unknown };
    const seconds = typeof v.seconds === 'number' ? v.seconds : 0;
    const nanos = typeof v.nanoseconds === 'number' ? v.nanoseconds : 0;
    if (seconds > 0 || nanos > 0) {
      return Math.floor(seconds * 1000 + nanos / 1_000_000);
    }
  }
  return 0;
}

export function getLastSeenMillis(user: User | null | undefined): number {
  return user ? presenceMillis(user.lastSeen) : 0;
}

function getLastActiveMillis(user: User | null | undefined): number {
  if (!user) return 0;
  const active = presenceMillis(user.lastActive);
  if (active > 0) return active;
  // Docs written by a build that only stamped `lastSeen` still have something
  // trustworthy to judge freshness from.
  return presenceMillis(user.lastSeen);
}

/**
 * Effective online state. A user is online ONLY if their doc says `online ===
 * true` AND their last heartbeat is fresh (within PRESENCE_STALE_MS). Anything
 * else (missing fields, stale timestamps, legacy docs without `online`) is
 * treated as offline — we never guess or trust a stale flag.
 */
export function isOnlineNow(user: User | null | undefined, now = Date.now()): boolean {
  if (!user) return false;
  if (user.online !== true) return false;
  const lastActive = getLastActiveMillis(user);
  if (lastActive <= 0) return false;
  return now - lastActive <= PRESENCE_STALE_MS;
}

// ── Session lifecycle ───────────────────────────────────────

function markOnline(): void {
  if (!active || !currentUid) return;
  if (!navigator.onLine) return;
  if (document.visibilityState !== 'visible') return;
  setUserOnline(currentUid);
}

function markOffline(): void {
  if (!active || !currentUid) return;
  setUserOffline(currentUid);
}

function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    markOnline();
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function handleVisibilityChange(): void {
  if (!active) return;
  if (document.visibilityState === 'visible') {
    markOnline();
    startHeartbeat();
  } else {
    stopHeartbeat();
    markOffline();
  }
}

function handlePageHide(): void {
  if (!active) return;
  stopHeartbeat();
  markOffline();
}

function handlePageShow(): void {
  if (!active) return;
  if (navigator.onLine && document.visibilityState === 'visible') {
    markOnline();
    startHeartbeat();
  } else {
    markOffline();
  }
}

function handleNetworkOnline(): void {
  if (!active) return;
  markOnline();
  if (document.visibilityState === 'visible') startHeartbeat();
}

function handleNetworkOffline(): void {
  if (!active) return;
  stopHeartbeat();
  markOffline();
}

/**
 * Start tracking presence for the authenticated user. Writes online + starts
 * the heartbeat, and wires every browser lifecycle/network event that can turn
 * the user offline immediately (tab hidden, page hide, unload, offline).
 */
export function initPresence(uid: string): void {
  if (active && currentUid === uid) return;
  destroyPresence();
  currentUid = uid;
  active = true;
  markOnline();
  if (navigator.onLine && document.visibilityState === 'visible') startHeartbeat();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide, { capture: true });
  window.addEventListener('pageshow', handlePageShow, { capture: true });
  window.addEventListener('online', handleNetworkOnline, { capture: true });
  window.addEventListener('offline', handleNetworkOffline, { capture: true });
  window.addEventListener('beforeunload', handlePageHide, { capture: true });
}

/**
 * Stop tracking presence and immediately write offline + lastSeen. Called when
 * auth becomes null (logout) or the provider unmounts.
 */
export function destroyPresence(): void {
  if (!active) return;
  active = false;
  stopHeartbeat();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pagehide', handlePageHide, { capture: true });
  window.removeEventListener('pageshow', handlePageShow, { capture: true });
  window.removeEventListener('online', handleNetworkOnline, { capture: true });
  window.removeEventListener('offline', handleNetworkOffline, { capture: true });
  window.removeEventListener('beforeunload', handlePageHide, { capture: true });
  const uid = currentUid;
  currentUid = null;
  if (uid) setUserOffline(uid);
}
