import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiMicrophone, HiOutlineStop } from 'react-icons/hi2';
import { useRecorder } from '@/hooks/useRecorder';
import { formatDuration } from '@/utils/format';

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, duration: number) => void;
  onStart: () => void;
  onStop: () => void;
  isRecording: boolean;
}

export default function VoiceRecorder({ onRecorded, onStart, onStop, isRecording }: VoiceRecorderProps) {
  const { startRecording, stopRecording, cancelRecording, analyserNode, isRecording: hookRecording, duration } = useRecorder();
  const [bars, setBars] = useState<number[]>(new Array(20).fill(2));
  const [slideX, setSlideX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!hookRecording || !analyserNode) {
      setBars(new Array(20).fill(2));
      return;
    }
    const data = new Uint8Array(analyserNode.frequencyBinCount);
    let animId: number;
    function loop() {
      if (!analyserNode) return;
      analyserNode.getByteFrequencyData(data);
      const step = Math.floor(data.length / 20);
      setBars(Array.from({ length: 20 }, (_, i) => Math.max(2, (data[i * step] / 255) * 28)));
      animId = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(animId);
  }, [hookRecording, analyserNode]);

  async function handleToggle() {
    if (hookRecording) {
      const finalDuration = duration;
      const blob = await stopRecording();
      if (blob) onRecorded(blob, finalDuration);
      onStop();
    } else {
      startRecording();
      onStart();
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    draggingRef.current = true;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current) return;
    const dx = e.touches[0].clientX - startXRef.current;
    setSlideX(Math.min(0, dx));
  }

  function handleTouchEnd() {
    draggingRef.current = false;
    if (slideX < -100) {
      cancelRecording();
      onStop();
    } else if (hookRecording) {
      handleToggle();
    }
    setSlideX(0);
  }

  useEffect(() => {
    if (!hookRecording && isRecording) {
      stopRecording();
    }
  }, [hookRecording, isRecording, stopRecording]);

  if (isRecording) {
    const cancelOpacity = Math.min(1, Math.abs(slideX) / 100);
    const cancelScale = 0.8 + cancelOpacity * 0.2;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        ref={containerRef}
        className="flex items-center gap-3 w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleToggle}
          className="w-11 h-11 bg-[var(--danger)] text-white rounded-[14px] flex items-center justify-center shadow-[0_4px_16px_rgba(239,68,68,0.3)] flex-shrink-0">
          <HiOutlineStop className="w-5 h-5" />
        </motion.button>

        <div className="flex-1 flex items-center gap-3 px-3">
          <div className="flex items-center gap-[3px] h-7">
            {bars.map((h, i) => (
              <motion.div key={i} animate={{ height: h }} transition={{ duration: 0.05 }}
                className="w-[3px] bg-[var(--danger)] rounded-full" style={{ height: h }} />
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[13px] text-[var(--text-primary)] font-mono tabular-nums">{formatDuration(duration)}</span>
            <motion.span
              animate={{ scale: cancelScale, opacity: cancelOpacity }}
              className="text-[12px] text-[var(--danger)] font-medium"
            >
              Slide to cancel
            </motion.span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.button whileTap={{ scale: 0.85 }} onClick={handleToggle}
      className="w-11 h-11 bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/30 rounded-[14px] flex items-center justify-center transition-all">
      <HiMicrophone className="w-5 h-5" />
    </motion.button>
  );
}
