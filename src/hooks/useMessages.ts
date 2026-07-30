import { useEffect, useRef, useState } from 'react';
import { subscribeToMessages, markMessagesAsRead } from '@/services/firestore';
import type { Message } from '@/types';

export function useMessages(conversationId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);

    const unsub = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);

      if (isAutoScrollRef.current) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          });
        });
      }
    });

    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    markMessagesAsRead(conversationId);
  }, [conversationId, currentUserId, messages.length]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
    isAutoScrollRef.current = true;
  }

  return { messages, loading, scrollRef, handleScroll, scrollToBottom };
}
