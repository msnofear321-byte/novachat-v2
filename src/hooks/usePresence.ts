import { useEffect, useState } from 'react';
import { subscribeToUserPresence, setOnlineStatus } from '@/services/firestore';
import type { User } from '@/types';

export function usePresence(userId: string) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!userId) return;

    setOnlineStatus(userId, 'online');

    const unsub = subscribeToUserPresence(userId, setUser);

    const handleBeforeUnload = () => setOnlineStatus(userId, 'offline');
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsub();
      handleBeforeUnload();
    };
  }, [userId]);

  return user;
}
