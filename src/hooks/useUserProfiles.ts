import { useEffect, useState } from 'react';
import { getCachedUserProfile, subscribeUserProfile } from '@/services/userResolver';
import type { User } from '@/types';

/**
 * Real-time profiles for a list of uids, returned as a `uid -> profile` map.
 *
 * - Rows render instantly from the shared cache on (re)mount — no skeleton
 *   flash for profiles already resolved.
 * - Every uid shares ONE Firestore onSnapshot across all consumers.
 * - Profile edits (name/photo) propagate to every row in realtime.
 * - uids missing a profile resolve to `undefined` (callers render a skeleton).
 *
 * The `uids` array should be memoized (useMemo) by callers.
 */
export function useUserProfiles(uids: string[]): Record<string, User | undefined> {
  const [profiles, setProfiles] = useState<Record<string, User | undefined>>(() => {
    const initial: Record<string, User | undefined> = {};
    uids.forEach((uid) => {
      if (uid) initial[uid] = getCachedUserProfile(uid);
    });
    return initial;
  });

  useEffect(() => {
    const unsubs = uids
      .filter((uid) => Boolean(uid))
      .map((uid) =>
        subscribeUserProfile(uid, (user) => {
          setProfiles((prev) => (prev[uid] === user ? prev : { ...prev, [uid]: user }));
        }),
      );
    return () => unsubs.forEach((unsub) => unsub());
  }, [uids]);

  return profiles;
}
