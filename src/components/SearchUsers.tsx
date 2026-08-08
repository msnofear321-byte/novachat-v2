import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineMagnifyingGlass, HiOutlineUserGroup } from 'react-icons/hi2';
import { searchUsers, createConversation } from '@/services/firestore';
import { useAuth } from '@/context/AuthContext';
import { isOnlineNow } from '@/services/presence';
import UserAvatar from '@/components/UserAvatar';
import GroupCreator from '@/components/GroupCreator';
import type { User } from '@/types';

interface SearchUsersProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (id: string) => void;
}

export default function SearchUsers({ isOpen, onClose, onConversationCreated }: SearchUsersProps) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupCreatorOpen, setGroupCreatorOpen] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setSearching(true);
    try {
      const users = await searchUsers(query);
      setResults(users);
    } catch (err) {
      console.error('searchUsers failed:', err);
      setError('Couldn\u2019t search right now. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handleStartChat(userId: string) {
    if (!currentUser) return;
    setError(null);
    setCreating(userId);
    try {
      // Ensure the conversation document exists (idempotent) BEFORE navigating so
      // the chat opens with a real conversation and no duplicates are created.
      const convId = await createConversation(userId);
      onConversationCreated(convId);
      handleClose();
    } catch (err) {
      console.error('createConversation failed:', err);
      setError('Couldn\u2019t start the chat. Please try again.');
    } finally {
      setCreating(null);
    }
  }

  function handleClose() {
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[10vh] px-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            className="w-full max-w-[480px] glass-premium rounded-[20px] sm:rounded-[24px] overflow-hidden flex flex-col max-h-[calc(100dvh-20vh-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--border-primary)]">
              <HiOutlineMagnifyingGlass className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-muted)] flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e as unknown as FormEvent); }}
                placeholder="Search by name, phone or ID..."
                className="flex-1 bg-transparent text-[var(--text-primary)] text-[14px] sm:text-[15px] placeholder-[var(--text-muted)] focus:outline-none"
              />
              <button onClick={handleClose} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-shrink-0">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              {searching && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                </div>
              )}

              {!searching && error && (
                <div className="py-6 px-5 text-center">
                  <p className="text-[13px] text-[var(--danger)]">{error}</p>
                </div>
              )}

              {!searching && results.length === 0 && query.trim() && !error && (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 rounded-[16px] bg-[var(--hover-bg)] flex items-center justify-center mx-auto mb-3">
                    <HiOutlineMagnifyingGlass className="w-7 h-7 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-secondary)] text-[14px]">No users found</p>
                </div>
              )}

              {results.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => handleStartChat(u.uid)}
                  disabled={creating === u.uid}
                  className="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg-strong)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <UserAvatar photoURL={u.photoURL} displayName={u.displayName} size="md" online={isOnlineNow(u)} />
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] text-[15px] truncate">{u.displayName}</p>
                    <p className="text-[var(--text-secondary)] text-[13px] truncate">{u.phone || u.email}</p>
                  </div>
                  {creating === u.uid && <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />}
                </button>
              ))}

              {!query.trim() && (
                <div className="py-12 text-center">
                  <button onClick={() => { setGroupCreatorOpen(true); }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--hover-bg)] transition-all rounded-[14px] mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                      <HiOutlineUserGroup className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-medium text-[var(--text-primary)] text-[15px]">Create New Group</p>
                  </button>
                  <div className="w-14 h-14 rounded-[16px] bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-3">
                    <HiOutlineMagnifyingGlass className="w-7 h-7 text-[var(--accent-secondary)]" />
                  </div>
                  <p className="text-[var(--text-secondary)] text-[14px]">Search for people to chat with</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <GroupCreator isOpen={groupCreatorOpen} onClose={() => setGroupCreatorOpen(false)} onGroupCreated={(id) => { setGroupCreatorOpen(false); onConversationCreated(id); }} />
    </AnimatePresence>
  );
}
