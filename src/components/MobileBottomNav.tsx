import { useNavigate, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { HiOutlineChatBubbleLeftRight, HiOutlineEye, HiOutlineUsers, HiOutlineCog6Tooth, HiOutlineShieldCheck, HiOutlinePencilSquare } from 'react-icons/hi2';

interface MobileBottomNavProps {
  onOpenSearch: () => void;
  totalUnread?: number;
}

const navItems = [
  { icon: HiOutlineChatBubbleLeftRight, label: 'Chats', path: '/' },
  { icon: HiOutlineEye, label: 'Status', path: '/status' },
  { icon: HiOutlinePencilSquare, label: 'Notes', path: '/notes' },
  { icon: HiOutlineShieldCheck, label: 'Secret', path: '/secret' },
  { icon: HiOutlineCog6Tooth, label: 'Settings', path: '/settings' },
] as const;

export default function MobileBottomNav({ onOpenSearch, totalUnread = 0 }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleTap(item: (typeof navItems)[number]) {
    navigate(item.path);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-bottom">
      <div className="bg-[var(--bg-card)]/95 backdrop-blur-xl border-t border-[var(--border-primary)]">
        <nav className="flex items-center justify-around h-[56px] px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.85 }}
                onClick={() => handleTap(item)}
                className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full"
              >
                <div className="relative">
                  <Icon className={`w-[22px] h-[22px] transition-colors ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
                  {item.path === '/' && totalUnread > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold flex items-center justify-center">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-[var(--accent-primary)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
