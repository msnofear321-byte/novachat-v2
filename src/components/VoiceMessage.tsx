import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiPlay, HiPause } from 'react-icons/hi2';
import { formatDuration } from '@/utils/format';

interface VoiceMessageProps {
  url: string;
  isOwn: boolean;
  duration?: number;
}

export default function VoiceMessage({ url, isOwn, duration: propDuration }: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(propDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const audio = new Audio(url);
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      if (!propDuration) setDuration(Math.floor(audio.duration));
    });
    audio.addEventListener('ended', () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      cancelAnimationFrame(animRef.current);
    });

    return () => {
      audio.pause();
      audio.src = '';
      cancelAnimationFrame(animRef.current);
    };
  }, [url, propDuration]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    setCurrentTime(audio.currentTime);
    setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    animRef.current = requestAnimationFrame(tick);
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      cancelAnimationFrame(animRef.current);
      setPlaying(false);
    } else {
      audio.playbackRate = speed;
      audio.play().catch(() => {});
      setPlaying(true);
      animRef.current = requestAnimationFrame(tick);
    }
  }

  function cycleSpeed() {
    const speeds = [1, 1.5, 2];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  return (
    <div className="flex items-center gap-3 min-w-0 w-full">
      <motion.button whileTap={{ scale: 0.85 }} onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          isOwn
            ? 'bg-white/20 text-white hover:bg-white/30'
            : 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25'
        } ${playing ? (isOwn ? 'shadow-[0_0_16px_rgba(255,255,255,0.2)]' : 'shadow-[0_0_16px_var(--accent-glow)]') : ''}`}>
        {playing ? <HiPause className="w-4 h-4" /> : <HiPlay className="w-4 h-4 ml-0.5" />}
      </motion.button>

      <div className="flex-1 min-w-0">
        {/* Waveform-like visualization */}
        <div className={`h-1.5 rounded-full overflow-hidden ${isOwn ? 'bg-white/20' : 'bg-[var(--border-primary)]'}`}>
          <motion.div
            className={`h-full rounded-full ${isOwn ? 'bg-white/80' : 'bg-[var(--accent-primary)]'}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        {/* Fake waveform bars behind progress */}
        <div className="flex items-end gap-[2px] h-3 mt-1 opacity-30">
          {Array.from({ length: 28 }, (_, i) => {
            const height = Math.sin(i * 0.5) * 8 + Math.random() * 4 + 3;
            const isPlayed = (i / 28) * 100 < progress;
            return (
              <div key={i} className={`w-[3px] rounded-full transition-colors duration-150 ${
                isPlayed
                  ? (isOwn ? 'bg-white/70' : 'bg-[var(--accent-primary)]')
                  : (isOwn ? 'bg-white/25' : 'bg-[var(--text-muted)]/30')
              }`} style={{ height: `${Math.max(3, Math.min(12, height))}px` }} />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
          <button onClick={cycleSpeed}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isOwn ? 'text-white/70 hover:bg-white/10' : 'text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10'
            } transition-all`}>
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}
