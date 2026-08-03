import { useEffect, useMemo, useState } from 'react';
import { subscribeToUserPresence } from '@/services/firestore';
import { isOnlineNow, getLastSeenMillis, PRESENCE_TICK_MS } from '@/services/presence';
import type { User } from '@/types';

/**
 * Read-only presence observer for a single user.
 *
 * IMPORTANT: this hook never writes to Firestore. Presence is only ever
 * written by the target user's own running session (src/services/presence.ts).
 * This observer just listens to the user doc and re-evaluates effective
 * online/last-seen state on a short tick so stale heartbeats flip to offline.
 */
export function usePresence(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeToUserPresence(userId, setUser);

    const timer = setInterval(() => setNow(Date.now()), PRESENCE_TICK_MS);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [userId]);

  const online = useMemo(() => isOnlineNow(user, now), [user, now]);
  const lastSeen = useMemo(() => (user ? getLastSeenMillis(user) : 0), [user]);

  return { user, online, lastSeen };
}
