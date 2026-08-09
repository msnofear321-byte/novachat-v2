import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineHeart, HiOutlineEye, HiOutlinePlus, HiOutlineTrash, HiOutlinePencilSquare, HiOutlineSparkles } from 'react-icons/hi2';
import { subscribeToStories, deleteStory, getSeenList, type Story } from '@/services/status';
import { subscribeToMyNote, deleteMyNote, isNoteActive, formatExpiresIn, type ChatNote } from '@/services/tempNotes';
import { getDisplayName } from '@/utils/userDisplay';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import StatusViewer from '@/components/StatusViewer';
import StatusComposer from '@/components/StatusComposer';
import NoteComposer from '@/components/NoteComposer';

export default function StatusPage() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [statusNow, setStatusNow] = useState(() => Date.now());
  const [viewingKey, setViewingKey] = useState<string>('');
  const [viewingStories, setViewingStories] = useState<Story[]>([]);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [myNote, setMyNote] = useState<ChatNote | null>(null);
  const [noteNow, setNoteNow] = useState(() => Date.now());
  const [undoToast, setUndoToast] = useState<{ story: Story; timer: ReturnType<typeof setTimeout> } | null>(null);
  const undoRef = useRef(undoToast);
  undoRef.current = undoToast;

  useEffect(() => {
    const unsub = subscribeToStories((s) => setStories(s));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToMyNote((note) => setMyNote(note));
    return unsub;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNoteNow(now);
      setStatusNow(now);
      // Best-effort cleanup: an expired own note or story must not linger in
      // Firestore even though the UI already stops showing it.
      setMyNote((current) => {
        if (current && !isNoteActive(current)) {
          deleteMyNote().catch(() => {});
          return null;
        }
        return current;
      });
      setStories((current) => {
        const expiredMine = current.filter(
          (s) => s.expiresAt <= now && s.userId === user?.uid,
        );
        expiredMine.forEach((s) => deleteStory(s.id).catch(() => {}));
        return current.filter((s) => s.expiresAt > now);
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  const handleDeleteNote = useCallback(async () => {
    try {
      await deleteMyNote();
      setMyNote(null);
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (undoRef.current?.timer) clearTimeout(undoRef.current.timer);
    };
  }, []);

  // Stories are re-filtered against `statusNow` (a 30s ticker) so they drop
  // from the UI at the exact 24h expiry even when Firestore has no new writes.
  const myStories = stories.filter((s) => s.userId === user?.uid && s.expiresAt > statusNow);
  const otherStories = stories.filter((s) => s.userId !== user?.uid && s.expiresAt > statusNow);

  const groupedOthers = otherStories.reduce<Record<string, Story[]>>((acc, s) => {
    (acc[s.userId] = acc[s.userId] || []).push(s);
    return acc;
  }, {});

  const groupedMine = myStories.length > 0
    ? { [user!.uid]: myStories }
    : {};

  function openViewer(storyGroup: Story[], index: number) {
    setViewingStories(storyGroup);
    setViewingIndex(index);
    setViewingKey(`${storyGroup[0]?.userId || 'mine'}_${Date.now()}`);
  }

  const handleDeleteStory = useCallback((story: Story) => {
    if (undoRef.current?.timer) clearTimeout(undoRef.current.timer);

    const timer = setTimeout(async () => {
      try {
        await deleteStory(story.id);
      } catch {
        // silent fail
      }
      setUndoToast(null);
    }, 5000);

    setUndoToast({ story, timer });
  }, []);

  const handleSeeViewers = useCallback(async () => {
    const seenUsers = new Map<string, string>();
    for (const s of myStories) {
      try {
        const list = await getSeenList(s.id);
        list.forEach((v) => seenUsers.set(v.uid, v.name));
      } catch {
        // skip this story's viewers
      }
    }
    const viewers = [...seenUsers.entries()];
    if (viewers.length === 0) {
      alert('No views yet');
      return;
    }
    alert(
      `Viewed by ${viewers.length} ${viewers.length === 1 ? 'person' : 'people'}: ` +
      viewers.map(([, name]) => name).join(', '),
    );
  }, [myStories]);

  const handleUndoDelete = useCallback(() => {
    if (!undoRef.current) return;
    clearTimeout(undoRef.current.timer);
    setUndoToast(null);
  }, []);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="max-w-[640px] mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-[26px] font-bold text-[var(--text-primary)]">Status</h1>
        </div>

        {/* My Note */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">My Note</h3>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {myNote && isNoteActive(myNote, noteNow) ? (
              <motion.div
                key="note"
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="premium-card p-4 flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center flex-shrink-0 shadow-[var(--accent-shadow)]">
                  <HiOutlineSparkles className="w-[22px] h-[22px] text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[var(--text-primary)] truncate">{myNote.text}</p>
                  <p className="text-[12px] text-[var(--text-muted)]">expires in {formatExpiresIn(myNote.expiresAt, noteNow)}</p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setNoteComposerOpen(true)}
                  aria-label="Edit note"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--accent-primary)] hover:bg-[var(--accent-glow)] transition-all flex-shrink-0">
                  <HiOutlinePencilSquare className="w-5 h-5" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleDeleteNote}
                  aria-label="Delete note"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all flex-shrink-0">
                  <HiOutlineTrash className="w-5 h-5" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                layout
                onClick={() => setNoteComposerOpen(true)}
                className="premium-card premium-card-hover p-4 flex items-center gap-3.5 w-full text-left hover:bg-[var(--hover-bg)] transition-all"
              >
                <div className="w-11 h-11 rounded-[13px] bg-[var(--accent-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <HiOutlinePlus className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[var(--text-primary)]">Set a Note</p>
                  <p className="text-[12px] text-[var(--text-muted)]">Share a short note that disappears after 24h</p>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* My Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">My Status</h3>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setComposerOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-[12px] text-[13px] font-medium hover:opacity-90 transition-all">
              <HiOutlinePlus className="w-4 h-4" />
              New
            </motion.button>
          </div>

          {myStories.length === 0 ? (
            <button onClick={() => setComposerOpen(true)}
              className="premium-card premium-card-hover p-5 flex items-center gap-4 w-full text-left hover:bg-[var(--hover-bg)] transition-all">
              <div className="w-14 h-14 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
                <HiOutlinePlus className="w-6 h-6 text-[var(--accent-primary)]" />
              </div>
              <div>
                <p className="text-[16px] font-medium text-[var(--text-primary)]">Add Status</p>
                <p className="text-[13px] text-[var(--text-muted)]">Tap to share a photo or video</p>
              </div>
            </button>
          ) : (
            <div className="premium-card overflow-hidden">
              <button onClick={() => openViewer(groupedMine[user!.uid], 0)}
                className="w-full flex items-center gap-4 p-4 hover:bg-[var(--hover-bg)] transition-all text-left">
                <div className="relative">
                  <UserAvatar photoURL={user?.photoURL ?? undefined} displayName={getDisplayName({ displayName: user?.displayName, email: user?.email, phone: user?.phoneNumber }) || '?'} size="lg" />
                  <div className="absolute inset-0 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium text-[var(--text-primary)]">My Status</p>
                  <p className="text-[13px] text-[var(--text-muted)]">{myStories.length} {myStories.length === 1 ? 'update' : 'updates'}</p>
                </div>
                <div className="flex items-center gap-4 text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5 text-[13px]">
                    <HiOutlineEye className="w-4.5 h-4.5" />
                    {myStories.reduce((sum, s) => sum + (s.seenBy?.length || 0), 0)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px]">
                    <HiOutlineHeart className="w-4.5 h-4.5" />
                    {myStories.reduce((sum, s) => sum + (s.likes?.length || 0), 0)}
                  </span>
                </div>
              </button>

              {/* My individual stories with delete */}
              <div className="border-t border-[var(--border-primary)] divide-y divide-[var(--border-primary)]">
                {myStories.map((story) => (
                  <div key={story.id} className="flex items-center gap-3.5 px-4 py-2.5">
                    <button onClick={() => openViewer(myStories, myStories.indexOf(story))} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
                      <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-[var(--bg-input)] shrink-0">
                        {story.type === 'image' ? (
                          <img src={story.mediaURL} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <video src={story.mediaURL} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] text-[var(--text-primary)] truncate">{story.text || story.type}</p>
                        <p className="text-[12px] text-[var(--text-muted)]">{new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleDeleteStory(story)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all">
                      <HiOutlineTrash className="w-4.5 h-4.5" />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Updates */}
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Recent Updates</h3>

          {Object.keys(groupedOthers).length === 0 ? (
            <div className="premium-card p-10 text-center">
              <p className="text-[var(--text-muted)] text-[14px]">No status updates yet</p>
              <p className="text-[var(--text-muted)] text-[12px] mt-1">When friends post updates, they'll appear here</p>
            </div>
          ) : (
            <div className="premium-card overflow-hidden divide-y divide-[var(--border-secondary)]">
              {Object.entries(groupedOthers).map(([userId, userStories]) => {
                const first = userStories[0];
                const totalViews = userStories.reduce((sum, s) => sum + (s.seenBy?.length || 0), 0);
                const totalLikes = userStories.reduce((sum, s) => sum + (s.likes?.length || 0), 0);
                const hasUnseen = userStories.some((s) => !s.seenBy?.includes(user?.uid || ''));

                return (
                  <div key={userId} className="flex items-center gap-4 p-4 hover:bg-[var(--hover-bg)] transition-all">
                    <button onClick={() => openViewer(userStories, 0)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                      <div className="relative">
                        <UserAvatar photoURL={first.userPhoto} displayName={first.userName} size="lg" />
                        <div className={`absolute inset-0 rounded-full border-2 ${hasUnseen ? 'border-white' : 'border-white/25'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[16px] font-medium text-[var(--text-primary)] truncate">{first.userName}</p>
                        <p className="text-[13px] text-[var(--text-muted)]">
                          {userStories.length} {userStories.length === 1 ? 'update' : 'updates'} · {new Date(first.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] px-1.5 py-1">
                        <HiOutlineEye className="w-4 h-4" />
                        {totalViews}
                      </span>
                      <span className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] px-1.5 py-1">
                        <HiOutlineHeart className="w-4 h-4" />
                        {totalLikes}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View detail button for my stories */}
        {myStories.length > 0 && (
          <div className="mt-4">
            <button onClick={handleSeeViewers}
              className="w-full premium-card premium-card-hover p-4 flex items-center justify-center gap-2 text-[var(--accent-primary)] text-[14px] font-medium hover:bg-[var(--hover-bg)] transition-all">
              <HiOutlineEye className="w-4.5 h-4.5" />
              See who viewed your status
            </button>
          </div>
        )}
      </div>

      {/* Undo toast */}
      <AnimatePresence>
        {undoToast && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[14px] shadow-[var(--shadow-xl)]">
            <p className="text-[13px] text-[var(--text-primary)] whitespace-nowrap">Status deleted</p>
            <button onClick={handleUndoDelete}
              className="px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-[8px] text-[12px] font-medium hover:opacity-90 transition-all">
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status viewer */}
      <AnimatePresence mode="wait">
        {viewingStories.length > 0 && (
          <StatusViewer key={viewingKey} stories={viewingStories} initialIndex={viewingIndex} onClose={() => { setViewingStories([]); setViewingKey(''); }} />
        )}
      </AnimatePresence>

      {/* Status composer */}
      <StatusComposer isOpen={composerOpen} onClose={() => setComposerOpen(false)} onUploaded={() => setComposerOpen(false)} />

      {/* Note composer */}
      <NoteComposer
        isOpen={noteComposerOpen}
        onClose={() => setNoteComposerOpen(false)}
        initialText={myNote?.text ?? ''}
        onSaved={() => setNoteComposerOpen(false)}
      />
    </div>
  );
}
