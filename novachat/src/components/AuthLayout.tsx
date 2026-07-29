import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  children: ReactNode;
  mode: 'login' | 'register';
  onToggle: () => void;
}

export default function AuthLayout({ children, mode: _mode, onToggle: _onToggle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex relative overflow-hidden" style={{ background: '#050505' }}>
      {/* Floating glowing purple blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-[-15%] right-[-8%] w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-[40%] left-[50%] w-[350px] h-[350px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.08), transparent 70%)' }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 3.3) % 100}%`,
              top: `${(i * 3.7 + 5) % 100}%`,
              width: (i % 3) + 1,
              height: (i % 3) + 1,
              background: i % 3 === 0 ? 'rgba(124,58,237,0.4)' : 'rgba(168,85,247,0.3)',
            }}
            animate={{
              y: [0, -((i % 5) * 12 + 20), 0],
              x: [0, ((i % 4) * 10 - 20), 0],
              opacity: [0.2, 0.7, 0.2],
            }}
            transition={{
              duration: (i % 6) + 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: (i % 5),
            }}
          />
        ))}
      </div>

      {/* Graphic Side - Left Panel */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#0a0a10] to-[#050505]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-[420px]">
          {/* Glowing Chat Bubble Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-12"
          >
            {/* Outer glow ring */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-[-16px] rounded-[42px] border-2 border-purple-400/20"
              style={{ boxShadow: '0 0 30px rgba(124,58,237,0.15), inset 0 0 30px rgba(124,58,237,0.05)' }}
            />
            {/* Inner glow ring */}
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute inset-[-8px] rounded-[36px] border border-purple-400/30"
              style={{ boxShadow: '0 0 20px rgba(124,58,237,0.2)' }}
            />
            {/* Main logo container */}
            <div
              className="relative w-[120px] h-[120px] rounded-[32px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.15))',
                border: '1px solid rgba(124,58,237,0.3)',
                boxShadow: '0 0 40px rgba(124,58,237,0.2), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <svg className="w-16 h-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {/* Floating dots inside the bubble */}
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[28px] left-[38px] w-[5px] h-[5px] rounded-full bg-purple-400/60"
              />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                className="absolute top-[28px] left-[50px] w-[5px] h-[5px] rounded-full bg-purple-400/60"
              />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                className="absolute top-[28px] left-[62px] w-[5px] h-[5px] rounded-full bg-purple-400/60"
              />
            </div>
          </motion.div>

          {/* Branding text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-center"
          >
            <h1 className="text-[44px] font-bold text-white tracking-tight leading-tight mb-4">
              Nova<span className="text-purple-400">Chat</span>
            </h1>
            <p className="text-[17px] text-white/50 font-medium leading-relaxed max-w-[300px]">
              End-to-end encrypted messaging with crystal-clear voice and video calls
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
                className="px-4 py-2 rounded-full text-[13px] font-medium text-purple-300/70 border border-purple-400/15 bg-purple-400/5"
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
                className="w-[100px] h-[180px] rounded-[18px] border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
              >
                <div className="absolute inset-x-2 top-3 h-2 rounded-full bg-white/10" />
                <div className="absolute inset-x-3 top-7 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-purple-400/20 w-3/4" />
                  <div className="h-1.5 rounded-full bg-white/10 w-1/2" />
                  <div className="h-1.5 rounded-full bg-white/10 w-2/3" />
                </div>
                <div className="absolute inset-x-3 top-16 space-y-2">
                  <div className="flex gap-1.5">
                    <div className="h-6 rounded-lg bg-purple-400/15 flex-1" />
                    <div className="h-6 rounded-lg bg-white/5 w-8" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-6 rounded-lg bg-white/5 w-8" />
                    <div className="h-6 rounded-lg bg-purple-400/15 flex-1" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-6 rounded-lg bg-purple-400/15 flex-1" />
                    <div className="h-6 rounded-lg bg-white/5 w-10" />
                  </div>
                </div>
              </motion.div>

              {/* Phone 2 - larger, center */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-[130px] h-[230px] rounded-[22px] border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.4), 0 0 30px rgba(124,58,237,0.1)' }}
              >
                <div className="absolute inset-x-3 top-4 h-2.5 rounded-full bg-white/10" />
                <div className="absolute inset-x-3 top-9 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-400/20" />
                    <div className="h-1.5 rounded-full bg-white/15 w-16" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-400/20" />
                    <div className="h-1.5 rounded-full bg-white/15 w-20" />
                  </div>
                </div>
                <div className="absolute inset-x-3 top-22 space-y-2">
                  <div className="flex justify-end">
                    <div className="h-8 rounded-xl rounded-tr-sm bg-purple-400/20 w-2/3" />
                  </div>
                  <div className="flex justify-start">
                    <div className="h-8 rounded-xl rounded-tl-sm bg-white/10 w-1/2" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-10 rounded-xl rounded-tr-sm bg-purple-400/20 w-3/4" />
                  </div>
                  <div className="flex justify-start">
                    <div className="h-6 rounded-xl rounded-tl-sm bg-white/10 w-2/5" />
                  </div>
                </div>
                {/* Typing indicator */}
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute bottom-6 left-3 flex gap-1 items-center"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400/20" />
                </motion.div>
              </motion.div>

              {/* Phone 3 - medium */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="w-[90px] h-[160px] rounded-[16px] border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden relative"
                style={{ boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}
              >
                <div className="absolute inset-x-2 top-3 h-2 rounded-full bg-white/10" />
                <div className="absolute inset-x-2 top-7 space-y-1">
                  <div className="h-12 rounded-lg bg-gradient-to-br from-purple-400/15 to-purple-500/15" />
                  <div className="h-1.5 rounded-full bg-white/10 w-2/3" />
                  <div className="h-1.5 rounded-full bg-white/10 w-1/2" />
                </div>
                <div className="absolute inset-x-2 top-24 space-y-1.5">
                  <div className="flex gap-1">
                    <div className="h-5 rounded bg-purple-400/15 flex-1" />
                    <div className="h-5 rounded bg-white/5 flex-1" />
                  </div>
                  <div className="flex gap-1">
                    <div className="h-5 rounded bg-white/5 flex-1" />
                    <div className="h-5 rounded bg-purple-400/15 flex-1" />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form Side - Right Panel */}
      <div className="w-full lg:w-[50%] xl:w-[45%] flex items-center justify-center p-6 sm:p-8 relative">
        {/* Subtle gradient on form side */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#050505]/50 to-[#050505]" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-8">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-[20px] mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.2))',
                border: '1px solid rgba(124,58,237,0.3)',
                boxShadow: '0 0 30px rgba(124,58,237,0.2)',
              }}
            >
              <svg className="w-9 h-9 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </motion.div>
            <h2 className="text-[28px] font-bold text-white tracking-tight">
              Nova<span className="text-purple-400">Chat</span>
            </h2>
          </div>

          {/* Neon glass card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="neon-glass rounded-[28px] p-8 relative overflow-hidden"
          >
            {/* Top shine line */}
            <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />

            {/* Animated background shimmer */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.03), transparent)',
                width: '50%',
              }}
            />

            {children}
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-white/20 text-[12px] mt-6 font-medium"
          >
            Protected by end-to-end encryption
          </motion.p>
        </div>
      </div>
    </div>
  );
}
