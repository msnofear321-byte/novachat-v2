import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const HEARTBEAT_MS = 20000;
const HEARTBEAT_JITTER = 5000;

let currentUid: string | null = null;
let active = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function flushPresenceStatus(status: 'online' | 'offline'): void {
  const uid = currentUid;
  if (!uid) return;

  const lastSeen = Date.now();
  void setDoc(
    doc(db, 'users', uid),
    { status, lastSeen },
    { merge: true },
  ).catch(() => {
    // Best effort: the next heartbeat or reconnect will resync presence.
  });
}

function writeOnline(): void {
  flushPresenceStatus('online');
}

function writeOffline(): void {
  flushPresenceStatus('offline');
}

function startHeartbeat(): void {
  stopHeartbeat();
  const interval = HEARTBEAT_MS + Math.random() * HEARTBEAT_JITTER;
  heartbeatTimer = setInterval(() => {
    writeOnline();
  }, interval);
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
    writeOnline();
    startHeartbeat();
  } else {
    stopHeartbeat();
    writeOffline();
  }
}

function handlePageHide(): void {
  if (!active) return;
  stopHeartbeat();
  writeOffline();
}

function handlePageShow(): void {
  if (!active) return;
  if (navigator.onLine) {
    writeOnline();
    startHeartbeat();
  } else {
    writeOffline();
  }
}

function handleNetworkOnline(): void {
  if (!active) return;
  writeOnline();
  startHeartbeat();
}

function handleNetworkOffline(): void {
  if (!active) return;
  stopHeartbeat();
  writeOffline();
}

export function initPresence(uid: string): void {
  if (active && currentUid === uid) return;
  destroyPresence();
  currentUid = uid;
  active = true;
  writeOnline();
  startHeartbeat();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide, { capture: true });
  window.addEventListener('pageshow', handlePageShow, { capture: true });
  window.addEventListener('online', handleNetworkOnline, { capture: true });
  window.addEventListener('offline', handleNetworkOffline, { capture: true });
  window.addEventListener('beforeunload', handlePageHide, { capture: true });
}

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
  writeOffline();
  currentUid = null;
}
