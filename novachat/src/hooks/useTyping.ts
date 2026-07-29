import { useEffect, useRef, useCallback } from 'react';
import { setTypingStatus } from '@/services/firestore';

export function useTyping(userId: string, conversationId: string) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startTyping = useCallback(() => {
    if (!userId || !conversationId) return;
    setTypingStatus(userId, conversationId, true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTypingStatus(userId, conversationId, false);
    }, 3000);
  }, [userId, conversationId]);

  const stopTyping = useCallback(() => {
    if (!userId || !conversationId) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTypingStatus(userId, conversationId, false);
  }, [userId, conversationId]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (userId && conversationId) {
        setTypingStatus(userId, conversationId, false);
      }
    };
  }, [userId, conversationId]);

  return { startTyping, stopTyping };
}
