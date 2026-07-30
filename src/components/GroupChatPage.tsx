import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineArrowLeft, HiOutlineInformationCircle, HiOutlineXMark } from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import { useWallpaper } from '@/context/WallpaperContext';
import {
  getGroup,
  subscribeToGroupMessages,
  sendGroupMessage,
  type Group,
} from '@/services/groups';
import { getUserById } from '@/services/firestore';
import { uploadToCloudinary, getFileType, getMediaDownloadURL } from '@/services/cloudinary';
import MessageInput from '@/components/MessageInput';
import MessageSkeleton from '@/components/MessageSkeleton';
import GroupInfoPanel from '@/components/GroupInfoPanel';
import { formatDateSeparator } from '@/utils/format';
import { formatTimestamp } from '@/utils/format';
import VoiceMessage from '@/components/VoiceMessage';
import { HiStar } from 'react-icons/hi';

interface GroupChatPageProps {
  groupId: string;
  onBack?: () => void;
}

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName?: string;
  text: string;
  createdAt: number;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
  mediaURL?: string;
  duration?: number;
  starred?: boolean;
  deleted?: boolean;
  forwarded?: boolean;
  replyTo?: { id: string; text: string; senderId: string; type: string };
}

function mergeGroupMessages(serverMessages: GroupMessage[], pendingMessages: GroupMessage[]) {
  const merged = [...serverMessages];

  pendingMessages.forEach((pending) => {
    const alreadyExists = serverMessages.some((server) => (
      server.senderId === pending.senderId &&
      server.groupId === pending.groupId &&
      server.type === pending.type &&
      server.text === pending.text &&
      server.createdAt === pending.createdAt
    ));

    if (!alreadyExists) {
      merged.push(pending);
    }
  });

  return merged.sort((a, b) => a.createdAt - b.createdAt);
}

export default function GroupChatPage({ groupId, onBack }: GroupChatPageProps) {
  const { user } = useAuth();
  const { wallpaper } = useWallpaper();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Record<string, { displayName: string; photoURL: string }>>({});
  const [searchQuery, setSearchQuery] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userMapRef = useRef(userMap);
  userMapRef.current = userMap;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadGroup() {
      const g = await getGroup(groupId);
      if (!cancelled && g) {
        setGroup(g);
        // Pre-fetch member profiles
        g.members.forEach((mid) => {
          if (!userMapRef.current[mid]) {
            getUserById(mid).then((u) => {
              if (u && !cancelled) {
                setUserMap((prev) => ({ ...prev, [u.uid]: { displayName: u.displayName, photoURL: u.photoURL } }));
              }
            });
          }
        });
      }
    }
    loadGroup();
    return () => { cancelled = true; };
  }, [groupId]);

  useEffect(() => {
    const unsub = subscribeToGroupMessages(groupId, (msgs) => {
      setMessages(msgs as unknown as GroupMessage[]);
      setLoading(false);
    });
    return unsub;
  }, [groupId]);

  const visibleMessages = useMemo(() => mergeGroupMessages(messages, pendingMessages), [messages, pendingMessages]);

  useEffect(() => {
    const timeout = setTimeout(() => scrollToBottom('auto'), 100);
    return () => clearTimeout(timeout);
  }, [visibleMessages.length, scrollToBottom]);

  async function handleSend(text: string) {
    if (!user) return;
    const createdAt = Date.now();
    const optimisticMessage: GroupMessage = {
      id: `optimistic-${createdAt}-${Math.random().toString(36).slice(2)}`,
      groupId,
      senderId: user.uid,
      text,
      createdAt,
      type: 'text',
      starred: false,
      deleted: false,
      forwarded: false,
    };

    setPendingMessages((prev) => [...prev, optimisticMessage]);
    setSendError(null);
    setTimeout(() => scrollToBottom(), 50);

    try {
      await sendGroupMessage(groupId, text);
      setPendingMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id));
      setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
      setPendingMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id));
      setSendError(error instanceof Error ? error.message : 'Failed to send');
      setTimeout(() => setSendError(null), 8000);
    }
  }

  async function handleFileSelect(file: File) {
    if (!user) return;
    setUploadProgress(0);
    setSendError(null);
    try {
      const result = await uploadToCloudinary(file, (p) => setUploadProgress(p));
      const type = getFileType(file);
      const mediaURL = getMediaDownloadURL(result.secure_url, type === 'voice' ? 'voice' : type);
      await sendGroupMessage(groupId, '', type, mediaURL);
      setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send file');
    } finally {
      setUploadProgress(null);
    }
  }

  async function handleVoiceRecorded(blob: Blob, duration: number) {
    if (!user) return;
    setUploadProgress(0);
    try {
      const result = await uploadToCloudinary(blob, (p) => setUploadProgress(p));
      const mediaURL = getMediaDownloadURL(result.secure_url, 'voice');
      await sendGroupMessage(groupId, '', 'voice', mediaURL);
      void duration;
      setTimeout(() => scrollToBottom(), 50);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send voice');
    } finally {
      setUploadProgress(null);
    }
  }

  const filteredMessages = searchText.trim()
    ? visibleMessages.filter((m) => m.text.toLowerCase().includes(searchText.toLowerCase()))
    : visibleMessages;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-chat)] relative">
      {/* Header */}
      <div className="px-4 md:px-5 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card)]/80 backdrop-blur-xl flex items-center gap-3">
        {onBack && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all md:hidden flex-shrink-0">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </motion.button>
        )}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white font-semibold text-[13px] flex-shrink-0">
            {group ? group.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] text-[15px] truncate">{group?.name || 'Loading...'}</h3>
            <p className="text-[12px] text-[var(--text-muted)] truncate">
              {group ? `${group.members.length} members` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSearchQuery(!searchQuery)}
            className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-all ${searchQuery ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'}`}>
            {searchQuery ? <HiOutlineXMark className="w-[18px] h-[18px]" /> : <HiOutlineMagnifyingGlass className="w-[18px] h-[18px]" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setInfoOpen(true)}
            className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-all">
            <HiOutlineInformationCircle className="w-[18px] h-[18px]" />
          </motion.button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchQuery && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="border-b border-[var(--border-primary)] bg-[var(--bg-card)]/80 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-3">
              <HiOutlineMagnifyingGlass className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              <input autoFocus type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search in group..." className="flex-1 bg-transparent text-[var(--text-primary)] text-[13px] placeholder-[var(--text-muted)] focus:outline-none" />
              <button onClick={() => { setSearchText(''); setSearchQuery(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
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
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-[18px] sm:rounded-[22px] bg-gradient-to-br from-[var(--accent-primary)]/15 to-transparent flex items-center justify-center mb-4 sm:mb-5 border border-[var(--accent-primary)]/10">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </motion.div>
            <p className="text-[var(--text-secondary)] text-[13px] sm:text-[14px] text-center">No messages yet. Say hello!</p>
          </div>
        ) : (
          <>
            {filteredMessages.map((msg, i) => {
              const isOwn = msg.senderId === user?.uid;
              const prev = filteredMessages[i - 1];
              const showSender = !prev || prev.senderId !== msg.senderId || (msg.createdAt - prev.createdAt > 300000);

              const prevDate = prev ? new Date(prev.createdAt).toDateString() : '';
              const curDate = new Date(msg.createdAt).toDateString();
              const showDateSep = !prev || curDate !== prevDate;

              const senderInfo = userMap[msg.senderId];
              const senderName = msg.senderName || senderInfo?.displayName || 'Unknown';
              const isAdmin = group?.admins?.includes(msg.senderId);

              if (msg.deleted) {
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-2 sm:px-4 mb-1`}>
                    <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--bg-input)] rounded-[16px] sm:rounded-[18px] border border-[var(--border-primary)] max-w-[85%] sm:max-w-[70%]">
                      <p className="text-[12px] sm:text-[13px] italic text-[var(--text-muted)]">Message deleted</p>
                    </div>
                  </motion.div>
                );
              }

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-center my-3 sm:my-4 px-2 sm:px-4">
                      <div className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[var(--bg-card)]/80 backdrop-blur-sm border border-[var(--border-primary)] text-[10px] sm:text-[11px] font-medium text-[var(--text-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                        {formatDateSeparator(msg.createdAt)}
                      </div>
                    </motion.div>
                  )}
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-2 sm:px-4 mb-1`}>
                    <div className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && showSender && (
                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                          {senderInfo?.photoURL ? (
                            <img src={senderInfo.photoURL} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/30 flex items-center justify-center text-[8px] font-bold text-[var(--accent-primary)]">
                              {senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[11px] font-semibold text-[var(--accent-primary)]">{senderName}</span>
                          {isAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">ADMIN</span>
                          )}
                        </div>
                      )}
                      <div className={`relative overflow-hidden ${isOwn ? 'rounded-[18px] rounded-br-[6px]' : 'rounded-[18px] rounded-bl-[6px]'} ${
                        isOwn
                          ? 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white shadow-[0_2px_16px_var(--accent-shadow)]'
                          : 'bg-[var(--bg-message-other)] border border-[var(--border-primary)] text-[var(--text-primary)] shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                      }`}>
                        {msg.type === 'text' && (
                          <div className="px-4 py-2.5">
                            <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>
                        )}
                        {(msg.type === 'image' || msg.type === 'gif') && msg.mediaURL && (
                          <div className="overflow-hidden">
                            <img src={msg.mediaURL} alt={msg.type} className="w-full max-w-[240px] sm:max-w-[280px] max-h-[200px] sm:max-h-[260px] object-cover" />
                          </div>
                        )}
                        {msg.type === 'video' && msg.mediaURL && (
                          <div className="overflow-hidden">
                            <video src={msg.mediaURL} controls preload="metadata" className="w-full max-w-[240px] sm:max-w-[280px] max-h-[200px] sm:max-h-[260px]" />
                          </div>
                        )}
                        {msg.type === 'voice' && msg.mediaURL && (
                          <div className="px-2 sm:px-3 py-2 sm:py-2.5">
                            <VoiceMessage url={msg.mediaURL} isOwn={isOwn} duration={msg.duration} />
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 pb-2 ${msg.type === 'text' ? '-mt-0.5' : ''}`}>
                          <span className={`text-[10.5px] ${isOwn ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
                            {formatTimestamp(msg.createdAt)}
                          </span>
                          {msg.starred && <HiStar className="w-3 h-3 text-[var(--accent-star)]" />}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
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

      {/* Input */}
      <MessageInput onSend={handleSend} onFileSelect={handleFileSelect} onTyping={() => { }}
        onVoiceRecorded={handleVoiceRecorded} uploadProgress={uploadProgress} />

      {/* Group info panel */}
      {group && (
        <GroupInfoPanel isOpen={infoOpen} onClose={() => setInfoOpen(false)} group={group} userMap={userMap} />
      )}
    </div>
  );
}
