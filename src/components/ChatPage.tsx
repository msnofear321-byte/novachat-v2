import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineArrowLeft, HiOutlinePhone, HiOutlineVideoCamera, HiOutlineXMark, HiOutlineInformationCircle } from 'react-icons/hi2';
import { HiOutlineBan } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useWallpaper } from '@/context/WallpaperContext';
import {
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  markMessagesAsDelivered,
  editMessage,
  starMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  setTypingStatus,
  subscribeToTypingStatus,
  subscribeToUserPresence,
  getUserById,
  blockUser,
  unblockUser,
  subscribeToBlockedStatus,
} from '@/services/firestore';
import { doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { uploadToCloudinary, getFileType, getMediaDownloadURL } from '@/services/cloudinary';
import { showBrowserNotification } from '@/services/notifications';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import TypingIndicator from '@/components/TypingIndicator';
import ReplyPreview from '@/components/ReplyPreview';
import ForwardModal from '@/components/ForwardModal';
import MessageSkeleton from '@/components/MessageSkeleton';
import ChatMenu from '@/components/ChatMenu';
import { formatDateSeparator, formatLastSeen, toMillis } from '@/utils/format';
import type { Conversation, Message, User } from '@/types';

interface ChatPageProps {
  conversationId: string;
  onBack?: () => void;
  onSearchOpen?: () => void;
  onConversationDeleted?: () => void;
}

function mergeMessages(serverMessages: Message[], pendingMessages: Message[]) {
  const merged = [...serverMessages];
  const serverKeys = new Set(
    serverMessages.map((server) => {
      const keyText = server.text || server.mediaURL || '';
      return `${server.senderId}:${server.receiverId}:${server.createdAt}:${server.type}:${keyText}`;
    }),
  );

  pendingMessages.forEach((pending) => {
    const keyText = pending.text || pending.mediaURL || '';
    const key = `${pending.senderId}:${pending.receiverId}:${pending.createdAt}:${pending.type}:${keyText}`;

    if (!serverKeys.has(key)) {
      merged.push(pending);
      serverKeys.add(key);
    }
  });

  return merged.sort((a, b) => a.createdAt - b.createdAt);
}

export default function ChatPage({ conversationId, onBack, onSearchOpen: _onSearchOpen, onConversationDeleted }: ChatPageProps) {
  const { user } = useAuth();
  const { wallpaper } = useWallpaper();

  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<User | undefined>();
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [typing, setTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevMsgCountRef = useRef(0);
  const deliveredRef = useRef(false);
  const readSyncRef = useRef(false);
  const otherUserRef = useRef<User | undefined>(undefined);
  otherUserRef.current = otherUser;

  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const lastSeenText = useMemo(
    () => (otherUser && otherUser.status !== 'online' ? formatLastSeen(toMillis(otherUser.lastSeen)) : ''),
    [otherUser, clock],
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!messagesEndRef.current) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = containerRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-message');
      setTimeout(() => el.classList.remove('highlight-message'), 2000);
    }
  }, []);

  useEffect(() => {
    deliveredRef.current = false;
    readSyncRef.current = false;
    setPendingMessages([]);
    setLoading(true);
    prevMsgCountRef.current = 0;
    const unsub = subscribeToMessages(
      conversationId,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);

        if (user) {
          const currentUid = user.uid || auth.currentUser?.uid;
          if (!readSyncRef.current) {
            readSyncRef.current = true;
            markMessagesAsRead(conversationId).catch(() => {});
          }

          if (!deliveredRef.current) {
            deliveredRef.current = true;
            markMessagesAsDelivered(conversationId).catch(() => {});
          }

          const undeliveredIncoming = msgs.filter((msg) => msg.senderId !== currentUid && !msg.delivered);
          if (undeliveredIncoming.length > 0) {
            const batch = writeBatch(db);
            undeliveredIncoming.forEach((msg) => {
              batch.update(doc(db, 'messages', conversationId, 'messages', msg.id), { delivered: true });
            });
            batch.commit().catch(() => {});
          }
        }

        const newCount = msgs.length;
        if (newCount > prevMsgCountRef.current) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.senderId !== user?.uid) {
            showBrowserNotification(
              otherUserRef.current?.displayName || 'New Message',
              lastMsg.type === 'text' ? lastMsg.text : `Sent a ${lastMsg.type}`,
            );
          }
        }
        prevMsgCountRef.current = newCount;
      },
      (error) => {
        console.error('subscribeToMessages error:', error);
        setLoading(false);
      },
    );
    return unsub;
  }, [conversationId, user]);

  useEffect(() => {
    const parts = conversationId.split('_');
    const otherId = parts.find((id) => id !== user?.uid) || '';
    if (!otherId) return;
    const unsub = subscribeToUserPresence(otherId, (u) => setOtherUser(u || undefined));
    getUserById(otherId).then((u) => { if (u) setOtherUser(u); });
    return unsub;
  }, [conversationId, user?.uid]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'conversations', conversationId), (snap) => {
      if (snap.exists()) {
        setConversation({ id: snap.id, ...snap.data() } as Conversation);
      }
    });
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    if (!user) return;
    const parts = conversationId.split('_');
    const otherId = parts.find((id) => id !== user.uid) || '';
    if (!otherId) return;
    const unsub = subscribeToTypingStatus(otherId, conversationId, setTyping);
    return unsub;
  }, [conversationId, user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToBlockedStatus(user.uid, (blocked) => {
      const parts = conversationId.split('_');
      const otherId = parts.find((id) => id !== user.uid) || '';
      setBlockedByMe(blocked.includes(otherId));
    });
    return unsub;
  }, [conversationId, user]);

  const visibleMessages = useMemo(() => mergeMessages(messages, pendingMessages), [messages, pendingMessages]);

  useEffect(() => {
    const timeout = setTimeout(() => scrollToBottom('auto'), 100);
    return () => clearTimeout(timeout);
  }, [visibleMessages.length, scrollToBottom]);

  const handleTyping = useCallback((active: boolean) => {
    if (!user) return;
    setTypingStatus(user.uid, conversationId, active);
    clearTimeout(typingTimeoutRef.current);
    if (active) {
      typingTimeoutRef.current = setTimeout(() => setTypingStatus(user.uid, conversationId, false), 5000);
    }
  }, [user, conversationId]);

  const otherId = conversationId.split('_').find((id) => id !== user?.uid) || '';

  const handleSend = useCallback(async (text: string) => {
    if (!user) return;
    const createdAt = Date.now();
    const optimisticMessage: Message = {
      id: `optimistic-${createdAt}-${Math.random().toString(36).slice(2)}`,
      conversationId,
      senderId: user.uid,
      receiverId: otherId,
      text,
      createdAt,
      read: false,
      delivered: false,
      type: 'text',
      starred: false,
      deleted: false,
      forwarded: false,
      pending: true,
    };

    setPendingMessages((prev) => [...prev, optimisticMessage]);
    setReplyTo(null);
    setSendError(null);
    setTimeout(() => scrollToBottom(), 50);

    try {
      const msgData: Record<string, unknown> = {
        conversationId,
        senderId: user.uid,
        receiverId: otherId,
        text,
        createdAt,
        read: false,
        delivered: false,
        type: 'text',
        starred: false,
        deleted: false,
        forwarded: false,
      };
      if (replyTo) {
        msgData.replyTo = { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId, type: replyTo.type };
      }
      await sendMessage(conversationId, msgData as Omit<Message, 'id'>);
      setPendingMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id));
      setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
      setPendingMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id));
      console.error('Failed to send message:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send message.');
      setTimeout(() => setSendError(null), 8000);
    }
  }, [user, conversationId, otherId, replyTo, scrollToBottom]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!user) return;
    setUploadProgress(0);
    setSendError(null);
    try {
      const result = await uploadToCloudinary(file, (p) => setUploadProgress(p));
      const type = getFileType(file);
      const fileType = type === 'voice' ? 'voice' : type;
      const mediaURL = getMediaDownloadURL(result.secure_url, fileType);
      const msgData: Record<string, unknown> = {
        conversationId, senderId: user.uid, receiverId: otherId,
        text: '', createdAt: Date.now(),
        read: false, delivered: false, type, mediaURL,
        starred: false, deleted: false, forwarded: false,
      };
      if (file.name) msgData.fileName = file.name;
      if (file.size) msgData.fileSize = file.size;
      if (file.type) msgData.mimeType = file.type;
      await sendMessage(conversationId, msgData as Omit<Message, 'id'>);
      setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
      console.error('Failed to send file:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send file.');
    } finally {
      setUploadProgress(null);
    }
  }, [user, conversationId, otherId, scrollToBottom]);

  const handleVoiceRecorded = useCallback(async (blob: Blob, duration: number) => {
    if (!user) return;
    setUploadProgress(0);
    setSendError(null);
    try {
      const result = await uploadToCloudinary(blob, (p) => setUploadProgress(p));
      const mediaURL = getMediaDownloadURL(result.secure_url, 'voice');
      await sendMessage(conversationId, {
        conversationId, senderId: user.uid, receiverId: otherId,
        text: '', createdAt: Date.now(),
        read: false, delivered: false, type: 'voice', mediaURL, duration,
        starred: false, deleted: false, forwarded: false,
      } as Omit<Message, 'id'>);
      setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
      console.error('Failed to send voice message:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send voice message.');
    } finally {
      setUploadProgress(null);
    }
  }, [user, conversationId, otherId, scrollToBottom]);

  const handleEdit = useCallback(async (msg: Message, newText: string) => {
    await editMessage(conversationId, msg.id, newText);
  }, [conversationId]);

  const handleStar = useCallback(async (msg: Message) => {
    await starMessage(conversationId, msg.id, !msg.starred);
  }, [conversationId]);

  const handleDeleteForMe = useCallback(async (msg: Message) => {
    await deleteMessageForMe(conversationId, msg.id);
  }, [conversationId]);

  const handleDeleteForEveryone = useCallback(async (msg: Message) => {
    const result = await deleteMessageForEveryone(conversationId, msg.id, msg);
    if (!result.success && result.error) {
      setSendError(result.error);
      setTimeout(() => setSendError(null), 5000);
    }
  }, [conversationId]);

  const handleCopy = useCallback((msg: Message) => {
    const textToCopy = msg.text || `[${msg.type}]`;
    navigator.clipboard.writeText(textToCopy).catch(() => {});
  }, []);

  function handleStartCall(type: 'voice' | 'video') {
    if (!user || !otherUser) return;
    window.dispatchEvent(new CustomEvent('call-start', {
      detail: {
        receiverId: otherId,
        receiverName: otherUser.displayName,
        receiverPhoto: otherUser.photoURL,
        type,
      },
    }));
  }

  const filteredMessages = searchQuery.trim()
    ? visibleMessages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : visibleMessages;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-chat)] relative">
      {/* Header */}
      <div className="px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card)]/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all md:hidden flex-shrink-0">
              <HiOutlineArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <button onClick={() => setShowProfileModal(true)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
            {otherUser ? (
              <>
                <div className="relative flex-shrink-0">
                  {otherUser.photoURL ? (
                    <img src={otherUser.photoURL} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--border-primary)]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] flex items-center justify-center text-white font-semibold text-[13px] ring-2 ring-[var(--border-primary)]">
                      {otherUser.displayName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-card)] ${otherUser.status === 'online' ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] text-[15px] truncate">{otherUser.displayName}</h3>
                  <p className={`text-[12px] truncate ${typing ? 'text-[var(--accent-primary)]' : otherUser.status === 'online' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                    {typing ? (
                      <span className="flex items-center gap-1">
                        <span className="typing-dots"><span /><span /><span /></span>
                        <span>typing</span>
                      </span>
                    ) : otherUser.status === 'online' ? 'Online' : lastSeenText}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] animate-pulse" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3.5 rounded bg-[var(--bg-input)] animate-pulse" />
                  <div className="w-16 h-2.5 rounded bg-[var(--bg-input)] animate-pulse" />
                </div>
              </div>
            )}
          </button>
          <div className="flex items-center gap-1">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleStartCall('voice')}
              className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--success-bg)] transition-all">
              <HiOutlinePhone className="w-[18px] h-[18px]" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleStartCall('video')}
              className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--success-bg)] transition-all">
              <HiOutlineVideoCamera className="w-[18px] h-[18px]" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSearchOpen(!searchOpen)}
              className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-all ${searchOpen ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'}`}>
              {searchOpen ? <HiOutlineXMark className="w-[18px] h-[18px]" /> : <HiOutlineMagnifyingGlass className="w-[18px] h-[18px]" />}
            </motion.button>
            <ChatMenu
              conversationId={conversationId}
              conversation={conversation}
              otherUserId={otherId}
              onSearchOpen={() => setSearchOpen(true)}
              onConversationDeleted={onConversationDeleted || (() => onBack?.())}
            />
          </div>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="border-b border-[var(--border-primary)] bg-[var(--bg-card)]/80 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-3">
              <HiOutlineMagnifyingGlass className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in conversation..." className="flex-1 bg-transparent text-[var(--text-primary)] text-[13px] placeholder-[var(--text-muted)] focus:outline-none" />
              {searchQuery && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase())).length} results
                </span>
              )}
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar momentum-scroll py-3 sm:py-4 pb-24 sm:pb-28"
        style={wallpaper?.css ? { backgroundImage: wallpaper.css, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {loading ? (
          <MessageSkeleton />
        ) : filteredMessages.length === 0 && searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-[18px] bg-[var(--hover-bg)] flex items-center justify-center mb-4">
              <HiOutlineMagnifyingGlass className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-secondary)] text-[14px]">No messages matching &ldquo;{searchQuery}&rdquo;</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-[var(--accent-primary)]/15 to-transparent flex items-center justify-center mb-5 border border-[var(--accent-primary)]/10"
            >
              <svg className="w-10 h-10 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </motion.div>
            <p className="text-[var(--text-secondary)] text-[14px] text-center">Say hello to start the conversation</p>
          </div>
        ) : (
          <>
            {filteredMessages.map((msg, i) => {
              const currentUid = user?.uid || auth.currentUser?.uid;
              const isOwn = msg.senderId === currentUid;
              const prev = filteredMessages[i - 1];
              const showSender = !prev || prev.senderId !== msg.senderId || (msg.createdAt - prev.createdAt > 300000);

              const prevDate = prev ? new Date(prev.createdAt).toDateString() : '';
              const curDate = new Date(msg.createdAt).toDateString();
              const showDateSep = !prev || curDate !== prevDate;

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-center my-4 px-4">
                      <div className="px-3.5 py-1.5 rounded-full bg-[var(--bg-card)]/80 backdrop-blur-sm border border-[var(--border-primary)] text-[11px] font-medium text-[var(--text-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                        {formatDateSeparator(msg.createdAt)}
                      </div>
                    </motion.div>
                  )}
                  <MessageBubble message={msg} isOwn={isOwn} showSender={showSender}
                    senderName={isOwn ? user?.displayName ?? undefined : otherUser?.displayName}
                    onReply={setReplyTo} onForward={setForwardMsg}
                    onStar={handleStar} onDelete={handleDeleteForMe}
                    onDeleteForEveryone={handleDeleteForEveryone}
                    onEdit={handleEdit} onCopy={handleCopy}
                    onScrollToMessage={scrollToMessage} />
                </div>
              );
            })}
            <TypingIndicator typing={typing} />
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Blocked banner */}
      <AnimatePresence>
        {blockedByMe && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-[var(--danger)]/20 bg-[var(--danger)]/5 overflow-hidden">
            <div className="px-4 py-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <HiOutlineBan className="w-5 h-5 text-[var(--danger)]" />
                <p className="text-[13px] text-[var(--text-secondary)]">You blocked this user.</p>
              </div>
              <p className="text-[12px] text-[var(--text-muted)]">You can&apos;t send messages.</p>
              <button onClick={async () => { await unblockUser(otherId); }}
                className="mt-1 px-4 py-1.5 rounded-[10px] text-[12px] font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-all">
                Unblock
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send error banner */}
      <AnimatePresence>
        {sendError && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-red-500/30 bg-red-500/10 overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-3">
              <p className="text-[13px] text-red-400 flex-1">{sendError}</p>
              <button onClick={() => setSendError(null)} className="text-red-400/60 hover:text-red-400 text-[13px]">Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply preview + Input */}
      <div className="flex-shrink-0">
        <AnimatePresence>
          <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} otherUserName={otherUser?.displayName} />
        </AnimatePresence>

        {!blockedByMe && (
          <MessageInput
            onSend={handleSend}
            onFileSelect={handleFileSelect}
            onTyping={handleTyping}
            onVoiceRecorded={handleVoiceRecorded}
            uploadProgress={uploadProgress}
            replyingTo={!!replyTo}
          />
        )}
      </div>

      {/* Forward modal */}
      <AnimatePresence>
        {forwardMsg && <ForwardModal message={forwardMsg} onClose={() => setForwardMsg(null)} />}
      </AnimatePresence>

      {/* Profile modal */}
      <AnimatePresence>
        {showProfileModal && otherUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowProfileModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-[340px] mx-auto bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-[24px] p-6 z-50 shadow-[var(--shadow-xl)]"
            >
              <div className="flex flex-col items-center text-center mb-5">
                {otherUser.photoURL ? (
                  <img src={otherUser.photoURL} alt="" className="w-20 h-20 rounded-full object-cover ring-3 ring-[var(--border-primary)] mb-3" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] flex items-center justify-center text-white font-semibold text-xl ring-3 ring-[var(--border-primary)] mb-3">
                    {otherUser.displayName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <h3 className="text-[17px] font-bold text-[var(--text-primary)]">{otherUser.displayName}</h3>
                <div className={`inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full text-[11px] font-medium ${otherUser.status === 'online' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-input)] text-[var(--text-muted)]'}`}>
                  {otherUser.status === 'online' ? (
                    <><div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" /> Online</>
                  ) : (
                    <><div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" /> Offline</>
                  )}
                </div>
              </div>

              {/* Bio */}
              {otherUser.about && (
                <div className="mb-5 px-3 py-3 rounded-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <HiOutlineInformationCircle className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Bio</span>
                  </div>
                  <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{otherUser.about}</p>
                </div>
              )}

              {/* Email & Phone */}
              <div className="space-y-2 mb-5">
                {otherUser.email && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-[var(--bg-input)]">
                    <span className="text-[12px] text-[var(--text-muted)] w-12">Email</span>
                    <span className="text-[13px] text-[var(--text-primary)] truncate">{otherUser.email}</span>
                  </div>
                )}
                {otherUser.phone && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-[var(--bg-input)]">
                    <span className="text-[12px] text-[var(--text-muted)] w-12">Phone</span>
                    <span className="text-[13px] text-[var(--text-primary)] truncate">{otherUser.phone}</span>
                  </div>
                )}
              </div>

              {/* Block/Unblock */}
              <button
                onClick={async () => {
                  try {
                    if (blockedByMe) {
                      await unblockUser(otherId);
                    } else {
                      await blockUser(otherId);
                    }
                    setShowProfileModal(false);
                  } catch (e) {
                    console.error('Block/unblock failed:', e);
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[13px] font-medium transition-all ${
                  blockedByMe
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20'
                    : 'bg-[var(--danger-bg)] text-[var(--danger)] hover:opacity-90'
                }`}
              >
                <HiOutlineBan className="w-4 h-4" />
                {blockedByMe ? 'Unblock User' : 'Block User'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
