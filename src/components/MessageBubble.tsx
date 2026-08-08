import { useState, useRef, useEffect, memo, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineStar, HiOutlineArrowUturnRight, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineChatBubbleLeftRight, HiOutlineDocumentDuplicate, HiOutlineFaceSmile, HiOutlineMapPin } from 'react-icons/hi2';
import { HiStar } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { formatTimestamp } from '@/utils/format';
import VoiceMessage from '@/components/VoiceMessage';
import type { Message } from '@/types';

export const MESSAGE_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥', '👏'] as const;

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  senderName?: string;
  onReply: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onStar: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onDeleteForEveryone?: (msg: Message) => void;
  onEdit?: (msg: Message, newText: string) => void;
  onCopy?: (msg: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  onReact?: (msg: Message, emoji: string) => void;
  onPin?: (msg: Message) => void;
  highlight?: string;
}

function highlightText(text: string, highlight: string): React.ReactNode {
  const q = highlight.trim().toLowerCase();
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = lower.indexOf(q);
  let key = 0;
  while (i !== -1) {
    if (i > last) out.push(<span key={key++}>{text.slice(last, i)}</span>);
    out.push(
      <mark key={key++} className="highlight-search">
        {text.slice(i, i + q.length)}
      </mark>,
    );
    last = i + q.length;
    i = lower.indexOf(q, last);
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>);
  return out.length ? out : text;
}

function MessageBubble({
  message, isOwn, showSender, senderName,
  onReply, onForward, onStar, onDelete, onDeleteForEveryone, onEdit, onCopy, onScrollToMessage, onReact, onPin, highlight,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const deleteRef = useRef<HTMLDivElement>(null);
  const reactionsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pressOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pressActiveRef = useRef(false);

  useEffect(() => {
    if (editing && editInputRef.current) editInputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showReactions) return;
    function handleClick(e: MouseEvent) {
      if (reactionsRef.current && !reactionsRef.current.contains(e.target as Node)) setShowReactions(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showReactions]);

  useEffect(() => {
    if (!menu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    }
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setMenu(null);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menu]);

  useEffect(() => {
    if (!showActions) return;
    function handleClick(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showActions]);

  useEffect(() => {
    if (!showDeleteOptions) return;
    function handleClick(e: MouseEvent) {
      if (deleteRef.current && !deleteRef.current.contains(e.target as Node)) setShowDeleteOptions(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDeleteOptions]);

  const canEdit = isOwn && message.type === 'text' && !message.deleted && !message.deletedForEveryone && message.createdAt && (Date.now() - message.createdAt < 15 * 60 * 1000);
  const canDeleteForEveryone = isOwn && !message.deleted && !message.deletedForEveryone && message.createdAt && (Date.now() - message.createdAt < 15 * 60 * 1000);

  function handleSaveEdit() {
    if (editText.trim() && onEdit && editText !== message.text) {
      onEdit(message, editText.trim());
    }
    setEditing(false);
  }

  function handleEditKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
    if (e.key === 'Escape') { setEditText(message.text); setEditing(false); }
  }

  function handleCopy() {
    if (onCopy) {
      onCopy(message);
    } else if (navigator.clipboard && message.text) {
      navigator.clipboard.writeText(message.text).catch(() => {});
    }
    setShowActions(false);
  }

  function handleDeleteClick() {
    if (canDeleteForEveryone) {
      setShowDeleteOptions(true);
    } else {
      onDelete(message);
    }
    setShowActions(false);
  }

  const openContextMenu = (x: number, y: number) => {
    setShowActions(false);
    setShowDeleteOptions(false);
    setShowReactions(false);
    const pad = 12;
    const menuW = 200;
    const menuH = 360;
    const clampedX = Math.max(pad, Math.min(x, window.innerWidth - menuW - pad));
    const clampedY = Math.max(pad, Math.min(y, window.innerHeight - menuH - pad));
    setMenu({ x: clampedX, y: clampedY });
  };

  const cancelLongPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = undefined;
    }
  };

  function handlePressStart(e: ReactPointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType !== 'touch') return;
    const target = e.target as HTMLElement;
    if (actionsRef.current?.contains(target) || deleteRef.current?.contains(target)) return;
    pressActiveRef.current = true;
    pressOriginRef.current = { x: e.clientX, y: e.clientY };
    cancelLongPress();
    pressTimerRef.current = setTimeout(() => {
      if (!pressActiveRef.current) return;
      pressActiveRef.current = false;
      openContextMenu(pressOriginRef.current.x, pressOriginRef.current.y);
    }, 500);
  }

  function handlePressMove(e: ReactPointerEvent) {
    if (!pressActiveRef.current) return;
    const dx = Math.abs(e.clientX - pressOriginRef.current.x);
    const dy = Math.abs(e.clientY - pressOriginRef.current.y);
    if (dx > 10 || dy > 10) cancelLongPress();
  }

  function handlePressEnd() {
    pressActiveRef.current = false;
    cancelLongPress();
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY);
  }

  if (message.deleted || message.deletedForEveryone) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-2 sm:px-4 mb-1`}>
        <div className="px-4 py-2.5 bg-[var(--bg-input)] rounded-[16px] sm:rounded-[18px] border border-[var(--border-primary)] max-w-[85%] sm:max-w-[70%]">
          <p className="text-[13px] italic text-[var(--text-muted)]">
            {message.deletedForEveryone
              ? (message.senderId === user?.uid ? 'You deleted this message.' : 'This message was deleted.')
              : 'Message deleted'}
          </p>
        </div>
      </motion.div>
    );
  }

  function renderReadReceipt() {
    if (!isOwn) return null;
    if (message.read) {
      return <span className="text-[var(--accent-read)] text-[11px] font-bold">{'\u2713\u2713'}</span>;
    }
    if (message.delivered) {
      return <span className="text-[var(--text-muted)] text-[11px] font-bold">{'\u2713\u2713'}</span>;
    }
    return <span className="text-[11px] text-white/40">{'\u2713'}</span>;
  }

  function renderMediaContent() {
    if (message.type === 'image' && message.mediaURL) {
      return (
        <div className="overflow-hidden">
          <img src={message.mediaURL} alt="image" loading="lazy" decoding="async" className="w-full max-w-[240px] sm:max-w-[280px] max-h-[200px] sm:max-h-[260px] object-cover hover:scale-[1.02] transition-transform duration-300" />
        </div>
      );
    }

    if (message.type === 'video' && message.mediaURL) {
      return (
        <div className="overflow-hidden">
          <video src={message.mediaURL} controls preload="metadata" className="w-full max-w-[240px] sm:max-w-[280px] max-h-[200px] sm:max-h-[260px]" />
        </div>
      );
    }

    if (message.type === 'voice' && message.mediaURL) {
      return (
        <div className="px-2 sm:px-3 py-2 sm:py-2.5">
          <VoiceMessage url={message.mediaURL} isOwn={isOwn} duration={message.duration} />
        </div>
      );
    }

    if (message.type === 'gif' && message.mediaURL) {
      return (
        <div className="overflow-hidden">
          <img src={message.mediaURL} alt="gif" loading="lazy" decoding="async" className="w-full max-w-[200px] sm:max-w-[240px] max-h-[160px] sm:max-h-[200px] object-cover" />
        </div>
      );
    }

    if (message.type === 'file' && message.mediaURL) {
      const isPDF = message.mimeType === 'application/pdf' || message.fileName?.endsWith('.pdf');
      const isAudio = message.mimeType?.startsWith('audio/');
      const isVideo = message.mimeType?.startsWith('video/');

      return (
        <div className="max-w-[240px] sm:max-w-[280px]">
          {isPDF && (
            <iframe
              src={message.mediaURL}
              loading="lazy"
              className="w-full h-[200px] border-0"
              title={message.fileName || 'PDF preview'}
            />
          )}
          {isAudio && (
            <div className="px-3 pt-3">
              <audio src={message.mediaURL} controls preload="metadata" className="w-full h-8" />
            </div>
          )}
          {isVideo && (
            <video src={message.mediaURL} controls preload="metadata" className="w-full max-w-[240px] sm:max-w-[280px] max-h-[180px] sm:max-h-[220px]" />
          )}
          <a href={message.mediaURL} download={message.fileName} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 ${isOwn ? 'text-white' : 'text-[var(--text-primary)]'} ${isPDF ? 'border-t border-white/10' : ''} hover:bg-white/5 transition-all`}>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-white/15' : 'bg-[var(--accent-glow)]'}`}>
              {isPDF ? (
                <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ) : isAudio ? (
                <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-[var(--accent-primary)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V3.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 3.75v10.5" />
                </svg>
              ) : (
                <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-[var(--accent-primary)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate">{message.fileName}</p>
              {message.fileSize && (
                <p className={`text-[11px] ${isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                  {message.fileSize > 1048576 ? `${(message.fileSize / 1048576).toFixed(1)} MB` : `${(message.fileSize / 1024).toFixed(0)} KB`}
                </p>
              )}
            </div>
          </a>
        </div>
      );
    }

    return null;
  }

  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-2 sm:px-4 mb-1 group`}
      data-message-id={message.id}
      onPointerDown={handlePressStart}
      onPointerMove={handlePressMove}
      onPointerUp={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onContextMenu={handleContextMenu}
    >
      <div className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[70%] min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {showSender && !isOwn && (
          <span className="text-[11px] font-semibold text-[var(--accent-primary)] mb-1 ml-1">{senderName}</span>
        )}

        {message.replyTo && (
          <button
            onClick={() => onScrollToMessage?.(message.replyTo!.id)}
            className={`mb-1.5 px-3 py-2 rounded-[12px] border border-[var(--border-primary)] bg-[var(--bg-input)] max-w-full text-left hover:bg-[var(--hover-bg)] transition-all ${
              isOwn ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'
            }`}
          >
            <p className="text-[11px] font-medium text-[var(--accent-secondary)]">
              {message.replyTo.senderId === user?.uid ? 'You' : senderName || 'User'}
            </p>
            <p className="text-[12px] text-[var(--text-secondary)] truncate">
              {message.replyTo.type === 'text' ? message.replyTo.text : `📎 ${message.replyTo.type}`}
            </p>
          </button>
        )}

        <div className={`relative overflow-hidden ${isOwn ? 'rounded-[16px] rounded-br-[4px]' : 'rounded-[16px] rounded-bl-[4px]'} ${
          isOwn
            ? 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white shadow-[0_1px_8px_var(--accent-glow)]'
            : 'bg-[var(--bg-message-other)] border border-[var(--border-primary)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
        }`}>
          {renderMediaContent()}

          {message.forwarded && (
            <div className={`px-4 pt-2.5 pb-0 flex items-center gap-1.5`}>
              <svg className={`w-3 h-3 ${isOwn ? 'text-white/50' : 'text-[var(--text-muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className={`text-[11px] italic ${isOwn ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>Forwarded</span>
            </div>
          )}

          {message.type === 'text' && (
            <div className="px-4 py-2.5">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input ref={editInputRef} value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={handleEditKeyDown}
                    className="flex-1 bg-transparent outline-none text-[14.5px] text-white placeholder-white/40" placeholder="Edit message..." />
                  <button onClick={handleSaveEdit} className="text-[11px] font-semibold text-white/70 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/10 transition-all">Save</button>
                  <button onClick={() => { setEditText(message.text); setEditing(false); }} className="text-[11px] text-white/50 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/10 transition-all">Esc</button>
                </div>
              ) : (
                <p className="text-fluid-message leading-relaxed whitespace-pre-wrap break-words wrap-anywhere">
                  {highlight ? highlightText(message.text, highlight) : message.text}
                </p>
              )}
            </div>
          )}

          <div className={`flex items-center gap-1.5 px-3 pb-2 ${message.type === 'text' ? '-mt-0.5' : ''}`}>
            <span className={`text-[10.5px] ${isOwn ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
              {formatTimestamp(message.createdAt)}
            </span>
            {message.pending && isOwn && (
              <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-[var(--text-muted)]'} flex items-center gap-1`}>
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-current opacity-70 animate-pulse" />
                  <span className="w-1 h-1 rounded-full bg-current opacity-70 animate-pulse [animation-delay:120ms]" />
                  <span className="w-1 h-1 rounded-full bg-current opacity-70 animate-pulse [animation-delay:240ms]" />
                </span>
                Sending
              </span>
            )}
            {message.edited && (
              <span className={`text-[10px] italic ${isOwn ? 'text-white/40' : 'text-[var(--text-muted)]'}`}>(edited)</span>
            )}
            {renderReadReceipt()}
            {message.starred && (
              <HiStar className="w-3 h-3 text-[var(--accent-star)]" />
            )}
            {message.pinned && (
              <HiOutlineMapPin className="w-3 h-3 text-[var(--accent-primary)] rotate-45" />
            )}
          </div>
        </div>

        {/* Reactions row */}
        {onReact && (
          <div ref={reactionsRef} className={`mt-1 flex items-center gap-1 flex-wrap ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {showReactions && (
              <div className="flex items-center gap-0.5 glass-premium rounded-full p-0.5 shadow-[var(--shadow-lg)]">
                {MESSAGE_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { onReact(message, emoji); setShowReactions(false); }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[15px] sm:text-[17px] transition-all active:scale-90 ${
                      message.reactions?.[emoji]?.includes(user?.uid || '') ? 'bg-[var(--accent-primary)]/20' : 'hover:bg-[var(--hover-bg)]'
                    }`}
                    title={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {Object.entries(message.reactions || {})
              .filter(([, uids]) => uids.length > 0)
              .map(([emoji, uids]) => {
                const mine = uids.includes(user?.uid || '');
                return (
                  <button
                    key={emoji}
                    onClick={() => onReact(message, emoji)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all active:scale-90 ${
                      mine
                        ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                        : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:bg-[var(--hover-bg)]'
                    }`}
                    title={uids.join(', ')}
                  >
                    <span className="text-[12px]">{emoji}</span>
                    <span>{uids.length}</span>
                  </button>
                );
              })}
            <button
              onClick={() => setShowReactions((v) => !v)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--hover-bg)] transition-all active:scale-90"
              title="Add reaction"
              aria-label="Add reaction"
            >
              <HiOutlineFaceSmile className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Delete options popover */}
        {showDeleteOptions && (
          <div ref={deleteRef} className="absolute top-full mt-1 left-0 right-0 z-30 glass-premium rounded-[12px] sm:rounded-[14px] shadow-[var(--shadow-xl)] overflow-hidden">
            <button onClick={() => { onDelete(message); setShowDeleteOptions(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] transition-all text-left">
              <HiOutlineTrash className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-[13px] text-[var(--text-primary)]">Delete for me</span>
            </button>
            {canDeleteForEveryone && (
              <button onClick={() => { onDeleteForEveryone?.(message); setShowDeleteOptions(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--danger-bg)] transition-all text-left border-t border-[var(--border-primary)]">
                <HiOutlineTrash className="w-4 h-4 text-[var(--danger)]" />
                <span className="text-[13px] text-[var(--danger)]">Delete for everyone</span>
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div ref={actionsRef} className={`${isTouchDevice ? 'message-actions' : 'absolute top-1/2 -translate-y-1/2 ' + (isOwn ? '-left-2 -translate-x-full' : '-right-2 translate-x-0') + ' opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20'}`}>
          <div className="flex items-center gap-0.5 glass-premium rounded-[10px] sm:rounded-[12px] p-0.5 shadow-[var(--shadow-lg)]">
            {[
              { icon: HiOutlineStar, title: 'Star', action: () => onStar(message), filled: message.starred },
              { icon: HiOutlineChatBubbleLeftRight, title: 'Reply', action: () => onReply(message) },
              { icon: HiOutlineArrowUturnRight, title: 'Forward', action: () => onForward(message) },
              { icon: HiOutlineDocumentDuplicate, title: 'Copy', action: handleCopy },
                  ...(canEdit ? [{ icon: HiOutlinePencilSquare, title: 'Edit', action: () => setEditing(true) }] : []),
              ...(isOwn ? [{ icon: HiOutlineTrash, title: 'Delete', action: handleDeleteClick }] : []),
            ].map(({ icon: Icon, title, action, filled }) => (
              <button key={title} onClick={(e) => { e.stopPropagation(); action(); }}
                className={`w-7 h-7 rounded-[8px] flex items-center justify-center transition-all ${
                  title === 'Delete' ? 'text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]'
                  : title === 'Translate' ? 'text-[var(--text-muted)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
                } ${filled ? 'text-[var(--accent-star)]' : ''}`}
                title={title}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Context menu (right-click / long-press) */}
        {menu && (
          <div
            ref={menuRef}
            style={{ left: menu.x, top: menu.y }}
            className="fixed z-[70] w-[200px] glass-premium rounded-[14px] shadow-[var(--shadow-xl)] overflow-hidden py-1 animate-spring"
          >
            {[
              { icon: HiOutlineFaceSmile, label: 'React', action: () => { setShowReactions(true); setMenu(null); } },
              { icon: HiOutlineChatBubbleLeftRight, label: 'Reply', action: () => { onReply(message); setMenu(null); } },
              { icon: message.starred ? HiStar : HiOutlineStar, label: message.starred ? 'Unstar' : 'Star', filled: message.starred, action: () => { onStar(message); setMenu(null); } },
              { icon: HiOutlineMapPin, label: message.pinned ? 'Unpin' : 'Pin', filled: !!message.pinned, action: () => { onPin?.(message); setMenu(null); } },
              { icon: HiOutlineArrowUturnRight, label: 'Forward', action: () => { onForward(message); setMenu(null); } },
              { icon: HiOutlineDocumentDuplicate, label: 'Copy', action: () => { handleCopy(); setMenu(null); } },
              ...(canEdit ? [{ icon: HiOutlinePencilSquare, label: 'Edit', action: () => { setEditing(true); setMenu(null); } }] : []),
              ...(isOwn ? [{ icon: HiOutlineTrash, label: 'Delete', danger: true, action: () => { handleDeleteClick(); setMenu(null); } }] : []),
              ...(canDeleteForEveryone ? [{ icon: HiOutlineTrash, label: 'Delete for everyone', danger: true, action: () => { onDeleteForEveryone?.(message); setMenu(null); } }] : []),
            ].map(({ icon: Icon, label, action, danger, filled }) => (
              <button key={label} onClick={(e) => { e.stopPropagation(); action(); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                  danger
                    ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                }`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${filled ? 'text-[var(--accent-star)]' : danger ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`} />
                <span className="text-[13px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(MessageBubble);
