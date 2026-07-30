import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineLink, HiOutlineShieldCheck, HiOutlineUserMinus, HiOutlineCheck, HiOutlinePlus } from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import { promoteToAdmin, demoteFromAdmin, removeMemberFromGroup } from '@/services/groups';
import UserAvatar from '@/components/UserAvatar';
import type { Group } from '@/services/groups';

interface GroupInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  userMap: Record<string, { displayName: string; photoURL: string }>;
}

export default function GroupInfoPanel({ isOpen, onClose, group, userMap }: GroupInfoPanelProps) {
  const { user } = useAuth();
  const isCreator = group.createdBy === user?.uid;
  const isAdmin = group.admins?.includes(user?.uid || '') || isCreator;
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleCopyInviteLink() {
    const link = `${window.location.origin}/group/${group.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch { /* ignore */ }
  }

  async function handleToggleAdmin(memberId: string) {
    if (!isAdmin || memberId === user?.uid) return;
    if (group.admins?.includes(memberId)) {
      await demoteFromAdmin(group.id, memberId);
    } else {
      await promoteToAdmin(group.id, memberId);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!isAdmin) return;
    await removeMemberFromGroup(group.id, memberId);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[380px] h-full bg-[var(--bg-sidebar)] border-l border-[var(--border-primary)] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--bg-sidebar)]/80 backdrop-blur-xl border-b border-[var(--border-primary)] px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] text-[16px]">Group Info</h3>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                  <HiOutlineXMark className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Group avatar & name */}
            <div className="flex flex-col items-center py-6 px-5">
              <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-[0_4px_20px_var(--accent-glow)]">
                {group.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-[18px] font-bold text-[var(--text-primary)] text-center">{group.name}</h2>
              {group.description && (
                <p className="text-[13px] text-[var(--text-secondary)] text-center mt-1">{group.description}</p>
              )}
              <p className="text-[12px] text-[var(--text-muted)] mt-2">{group.members.length} members</p>
            </div>

            {/* Invite link */}
            <div className="px-5 mb-6">
              <span className="section-label">Invite</span>
              <div className="mt-2">
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleCopyInviteLink}
                  className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                      <HiOutlineLink className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)] text-[14px]">
                        {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
                      </p>
                      <p className="text-[var(--text-muted)] text-[12px]">Share this link to invite others</p>
                    </div>
                    {copiedLink && <HiOutlineCheck className="w-5 h-5 text-[var(--success)]" />}
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Members */}
            <div className="px-5 mb-6">
              <span className="section-label">Members ({group.members.length})</span>
              <div className="mt-2 space-y-1">
                {group.members.map((mid) => {
                  const info = userMap[mid];
                  const name = info?.displayName || 'Loading...';
                  const photo = info?.photoURL || '';
                  const memberIsAdmin = group.admins?.includes(mid);
                  const isMe = mid === user?.uid;

                  return (
                    <div key={mid} className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-[var(--hover-bg)] transition-all group/item">
                      <UserAvatar photoURL={photo || undefined} displayName={name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">{name}</p>
                          {isMe && <span className="text-[11px] text-[var(--text-muted)]">(You)</span>}
                        </div>
                      </div>
                      {memberIsAdmin && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex-shrink-0">ADMIN</span>
                      )}
                      {isAdmin && !isMe && (
                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button onClick={() => handleToggleAdmin(mid)}
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-glow)] hover:text-[var(--accent-primary)] transition-all"
                            title={memberIsAdmin ? 'Remove admin' : 'Make admin'}>
                            <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleRemoveMember(mid)}
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-all"
                            title="Remove member">
                            <HiOutlineUserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger zone */}
            {isAdmin && (
              <div className="px-5 mb-6">
                <span className="section-label">Admin</span>
                <div className="mt-2">
                  <button onClick={handleCopyInviteLink}
                    className="w-full premium-card p-4 hover:border-[var(--accent-primary)]/20 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)]">
                        <HiOutlinePlus className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)] text-[14px]">Add Members</p>
                        <p className="text-[var(--text-muted)] text-[12px]">Share invite link to add more people</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
