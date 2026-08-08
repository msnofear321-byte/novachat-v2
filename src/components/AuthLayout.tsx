import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  children: ReactNode;
  mode: 'login' | 'register';
  onToggle: () => void;
}

function NovaLogo({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default function AuthLayout({ children, mode: _mode, onToggle: _onToggle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Brand doodle-style watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(var(--border-accent) 1px, transparent 1.5px), radial-gradient(var(--border-accent) 1px, transparent 1.5px)',
          backgroundSize: '22px 22px, 22px 22px',
          backgroundPosition: '0 0, 11px 11px',
        }}
      />

      {/* Graphic Side - Left Panel */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-gradient-end)]">
        {/* Dotted pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(#FFFFFF 1.5px, transparent 2px), radial-gradient(#FFFFFF 1.5px, transparent 2px)',
            backgroundSize: '36px 36px, 36px 36px',
            backgroundPosition: '0 0, 18px 18px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-[420px]">
          {/* NovaChat Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-12"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-[-16px] rounded-[42px] border-2 border-white/20"
              style={{ boxShadow: '0 0 30px rgba(0,0,0,0.15), inset 0 0 30px rgba(255,255,255,0.05)' }}
            />
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute inset-[-8px] rounded-[36px] border border-white/25"
              style={{ boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}
            />
            <div
              className="relative w-[120px] h-[120px] rounded-[32px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-gradient-end))',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: 'var(--accent-shadow-lg)',
              }}
            >
              <NovaLogo size={76} />
            </div>
          </motion.div>

          {/* Branding text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-center"
          >
            <h1 className="text-[44px] font-bold text-white tracking-tight leading-tight mb-4">NovaChat</h1>
            <p className="text-[17px] text-white/85 font-medium leading-relaxed max-w-[300px]">
              Simple. Reliable. Secure. End-to-end encrypted messaging with crystal-clear voice and video calls
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="flex flex-wrap gap-3 mt-10 justify-center"
          >
            {['End-to-End Encrypted', 'Voice & Video Calls', 'Status & Stories'].map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="px-4 py-2 rounded-full text-[13px] font-medium text-white/90 border border-white/25 bg-white/10 backdrop-blur-sm"
              >
                {feature}
              </motion.div>
            ))}
          </motion.div>

          {/* Animated phone mockups */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-14 relative"
          >
            <div className="flex gap-5 items-end">
              {/* Phone 1 - smaller */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="w-[100px] h-[180px] rounded-[18px] border border-white/15 bg-white/[0.06] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
              >
                <div className="absolute inset-x-2 top-3 h-2 rounded-full bg-white/10" />
                <div className="absolute inset-x-3 top-7 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-[var(--accent-glow-strong)] w-3/4" />
                  <div className="h-1.5 rounded-full bg-white/15 w-1/2" />
                  <div className="h-1.5 rounded-full bg-white/15 w-2/3" />
                </div>
                <div className="absolute inset-x-3 top-16 space-y-2">
                  <div className="flex gap-1.5">
                    <div className="h-6 rounded-lg bg-[var(--accent-glow-strong)] flex-1" />
                    <div className="h-6 rounded-lg bg-white/10 w-8" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-6 rounded-lg bg-white/10 w-8" />
                    <div className="h-6 rounded-lg bg-[var(--accent-glow-strong)] flex-1" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-6 rounded-lg bg-[var(--accent-glow-strong)] flex-1" />
                    <div className="h-6 rounded-lg bg-white/10 w-10" />
                  </div>
                </div>
              </motion.div>

              {/* Phone 2 - larger, center */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-[130px] h-[230px] rounded-[22px] border border-white/15 bg-white/[0.06] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.4), 0 0 30px rgba(0,0,0,0.1)' }}
              >
                <div className="absolute inset-x-3 top-4 h-2.5 rounded-full bg-white/10" />
                <div className="absolute inset-x-3 top-9 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[var(--accent-glow-strong)]" />
                    <div className="h-1.5 rounded-full bg-white/15 w-16" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[var(--accent-glow-strong)]" />
                    <div className="h-1.5 rounded-full bg-white/15 w-20" />
                  </div>
                </div>
                <div className="absolute inset-x-3 top-22 space-y-2">
                  <div className="flex justify-end">
                    <div className="h-8 rounded-xl rounded-tr-sm bg-[var(--accent-glow-strong)] w-2/3" />
                  </div>
                  <div className="flex justify-start">
                    <div className="h-8 rounded-xl rounded-tl-sm bg-white/15 w-1/2" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-10 rounded-xl rounded-tr-sm bg-[var(--accent-glow-strong)] w-3/4" />
                  </div>
                  <div className="flex justify-start">
                    <div className="h-6 rounded-xl rounded-tl-sm bg-white/15 w-2/5" />
                  </div>
                </div>
                {/* Typing indicator */}
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute bottom-6 left-3 flex gap-1 items-center"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                </motion.div>
              </motion.div>

              {/* Phone 3 - medium */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="w-[90px] h-[160px] rounded-[16px] border border-white/15 bg-white/[0.06] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}
              >
                <div className="absolute inset-x-2 top-3 h-2 rounded-full bg-white/10" />
                <div className="absolute inset-x-2 top-7 space-y-1">
                  <div className="h-12 rounded-lg bg-gradient-to-br from-[var(--accent-glow-strong)]/80 to-[var(--accent-glow)]/40" />
                  <div className="h-1.5 rounded-full bg-white/15 w-2/3" />
                  <div className="h-1.5 rounded-full bg-white/15 w-1/2" />
                </div>
                <div className="absolute inset-x-2 top-24 space-y-1.5">
                  <div className="flex gap-1">
                    <div className="h-5 rounded bg-[var(--accent-glow-strong)] flex-1" />
                    <div className="h-5 rounded bg-white/10 flex-1" />
                  </div>
                  <div className="flex gap-1">
                    <div className="h-5 rounded bg-white/10 flex-1" />
                    <div className="h-5 rounded bg-[var(--accent-glow-strong)] flex-1" />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form Side - Right Panel */}
      <div className="w-full lg:w-[50%] xl:w-[45%] flex items-center justify-center p-6 sm:p-8 relative">
        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-8">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-[20px] mb-4"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gradient-end))' }}
            >
              <NovaLogo size={40} />
            </motion.div>
            <h2 className="text-[28px] font-bold text-[var(--accent-primary)] tracking-tight">NovaChat</h2>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="glass-strong rounded-[28px] p-8 relative overflow-hidden"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-gradient-end)]" />

            {children}
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-[var(--text-muted)] text-[12px] mt-6 font-medium"
          >
            Protected by end-to-end encryption
          </motion.p>
        </div>
      </div>
    </div>
  );
}
