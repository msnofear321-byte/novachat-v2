import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineCheck, HiOutlineUserGroup, HiOutlineArrowLeft } from 'react-icons/hi2';
import { createGroup } from '@/services/groups';
import { searchUsers } from '@/services/firestore';
import UserAvatar from '@/components/UserAvatar';
import type { User } from '@/types';

interface GroupCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (groupId: string) => void;
}

export default function GroupCreator({ isOpen, onClose, onGroupCreated }: GroupCreatorProps) {
  const [step, setStep] = useState<'members' | 'details'>('members');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await searchUsers(query);
        setResults(users.filter((u) => !selected.find((s) => s.uid === u.uid)));
      } catch (e) {
        console.error('Group member search failed:', e);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  function toggleSelect(u: User) {
    setError(null);
    if (selected.find((s) => s.uid === u.uid)) {
      setSelected((s) => s.filter((x) => x.uid !== u.uid));
    } else {
      setSelected((s) => [...s, u]);
    }
  }

  function goToDetails() {
    setError(null);
    if (selected.length === 0) {
      setError('Select at least one member to create a group.');
      return;
    }
    setStep('details');
  }

  async function handleCreate() {
    const name = groupName.trim();
    if (!name) {
      setError('Group name is required.');
      return;
    }
    if (selected.length === 0) {
      setError('Select at least one member to create a group.');
      return;
    }
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const groupId = await createGroup(
        name,
        selected.map((u) => u.uid),
        groupDesc.trim(),
      );
      handleClose();
      onGroupCreated?.(groupId);
    } catch (e) {
      console.error('Failed to create group:', e);
      setError(e instanceof Error ? e.message : 'Couldn\u2019t create the group. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function handleClose() {
    setStep('members');
    setQuery('');
    setResults([]);
    setSelected([]);
    setGroupName('');
    setGroupDesc('');
    setError(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
            className="w-full max-w-[480px] glass-premium rounded-[24px] overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)] flex-shrink-0">
              <div className="flex items-center gap-2">
                {step === 'details' && (
                  <button onClick={() => setStep('members')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                    <HiOutlineArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {step === 'members' ? 'Add Members' : 'Group Details'}
                </h3>
              </div>
              <button onClick={handleClose} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {step === 'members' && (
              <div className="p-5 flex-1 flex flex-col min-h-0 overflow-hidden">
                {selected.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {selected.map((u) => (
                      <span key={u.uid} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] rounded-full text-[12px] font-medium">
                        {u.displayName}
                        <button onClick={() => toggleSelect(u)} aria-label={`Remove ${u.displayName}`} className="hover:text-[var(--danger)]">
                          <HiOutlineXMark className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users..." autoFocus
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[var(--text-primary)] text-[13px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/25 mb-3" />

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  {searching && (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                    </div>
                  )}
                  {!searching && results.length === 0 && query.trim() && (
                    <div className="py-6 text-center text-[13px] text-[var(--text-secondary)]">No users found</div>
                  )}
                  {results.map((u) => (
                    <button key={u.uid} onClick={() => toggleSelect(u)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        selected.find((s) => s.uid === u.uid)
                          ? 'bg-[var(--accent-primary)]/10'
                          : 'hover:bg-[var(--hover-bg)]'
                      }`}>
                      <UserAvatar photoURL={u.photoURL} displayName={u.displayName} size="sm" />
                      <span className="text-[13px] text-[var(--text-primary)] flex-1 text-left">{u.displayName}</span>
                      {selected.find((s) => s.uid === u.uid) && (
                        <HiOutlineCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                      )}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="mt-3 text-[12px] text-[var(--danger)]">{error}</p>
                )}

                <button onClick={goToDetails}
                  className="w-full mt-4 py-3 bg-[var(--accent-primary)] text-white rounded-[14px] font-medium text-[14px] disabled:opacity-40 transition-all flex-shrink-0">
                  Next ({selected.length} selected)
                </button>
              </div>
            )}

            {step === 'details' && (
              <div className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                <div className="w-16 h-16 rounded-[16px] bg-[var(--accent-primary)]/15 flex items-center justify-center mx-auto">
                  <HiOutlineUserGroup className="w-8 h-8 text-[var(--accent-primary)]" />
                </div>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name" autoFocus maxLength={50}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[14px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/25" />
                <input type="text" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Group description (optional)" maxLength={200}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[14px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/25" />

                <div className="flex flex-wrap gap-1.5">
                  {selected.map((u) => (
                    <span key={u.uid} className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] rounded-full text-[11px] font-medium">
                      {u.displayName}
                      <button onClick={() => { toggleSelect(u); }} aria-label={`Remove ${u.displayName}`} className="hover:text-[var(--danger)]">
                        <HiOutlineXMark className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {error && (
                  <p className="text-[12px] text-[var(--danger)]">{error}</p>
                )}

                <button onClick={handleCreate} disabled={!groupName.trim() || creating}
                  className="w-full py-3 bg-[var(--accent-primary)] text-white rounded-[14px] font-medium text-[14px] disabled:opacity-40 transition-all">
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : 'Create Group'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
