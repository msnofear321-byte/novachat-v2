import { motion } from 'framer-motion';

interface UserAvatarProps {
  photoURL?: string;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-11 h-11 text-[14px]',
  lg: 'w-[52px] h-[52px] text-[17px]',
};

const dotSizes = {
  sm: 'w-2.5 h-2.5 right-0 bottom-0 border-[1.5px]',
  md: 'w-3 h-3 right-0 bottom-0 border-2',
  lg: 'w-3.5 h-3.5 right-0.5 bottom-0.5 border-2',
};

export default function UserAvatar({ photoURL, displayName, size = 'md', online, className = '' }: UserAvatarProps) {
  const initials = displayName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {photoURL ? (
        <img src={photoURL} alt={displayName} className={`${sizes[size]} rounded-full object-cover ring-2 ring-[var(--border-primary)]`} />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] flex items-center justify-center text-white font-semibold ring-2 ring-[var(--border-primary)]`}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute ${dotSizes[size]} rounded-full border-[var(--bg-primary)] ${online ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`}
        />
      )}
    </div>
  );
}
