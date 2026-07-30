import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  typing: boolean;
}

export default function TypingIndicator({ typing }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {typing && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-4 py-1.5">
          <div className="flex items-center gap-[5px] px-4 py-3 bg-[var(--bg-message-other)] border border-[var(--border-primary)] rounded-[18px] rounded-bl-[6px] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            {[0, 1, 2].map((i) => (
              <motion.div key={i}
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2, ease: 'easeInOut' }}
                className="w-[7px] h-[7px] rounded-full bg-[var(--accent-primary)]"
              />
            ))}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] font-medium">typing</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
