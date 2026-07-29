import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineXMark, HiOutlinePaperAirplane, HiOutlineHeart, HiOutlineEye } from 'react-icons/hi2';
import { markStorySeen, replyToStory, likeStory, unlikeStory, type Story } from '@/services/status';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';

interface StatusViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

const IMAGE_DURATION = 5000;
const VIDEO_DURATION = 15000;
const PROGRESS_INTERVAL = 50;

export default function StatusViewer({ stories, initialIndex = 0, onClose }: StatusViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const seenRef = useRef<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(IMAGE_DURATION);
  const story = stories[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleVideoMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    const raw = vid.duration * 1000;
    durationRef.current = Math.min(raw, 60000);
  }, []);

  useEffect(() => {
    if (!story) return;
    if (!seenRef.current.has(story.id)) {
      seenRef.current.add(story.id);
      markStorySeen(story.id);
    }
    setProgress(0);
    setPaused(false);
    durationRef.current = story.type === 'video' ? VIDEO_DURATION : IMAGE_DURATION;

    const step = (PROGRESS_INTERVAL / durationRef.current) * 100;

    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timerRef.current);
          timerRef.current = undefined;
          return 100;
        }
        return p + step;
      });
    }, PROGRESS_INTERVAL);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [currentIndex, story?.id, story?.type]);

  useEffect(() => {
    if (!story) return;
    if (paused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    } else {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p;
      });
      if (progress < 100) {
        timerRef.current = setInterval(() => {
          setProgress((p) => {
            if (p >= 100) {
              clearInterval(timerRef.current);
              timerRef.current = undefined;
              return 100;
            }
            return p + (PROGRESS_INTERVAL / durationRef.current) * 100;
          });
        }, PROGRESS_INTERVAL);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  useEffect(() => {
    if (!story || story.type !== 'video' || !videoRef.current) return;
    if (paused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [paused, story?.id, story?.type]);

  useEffect(() => {
    if (!story || story.type !== 'video' || !videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
  }, [story?.id, story?.type]);

  async function handleReply() {
    if (!replyText.trim() || !story) return;
    await replyToStory(story.id, story.userId, replyText.trim());
    setReplyText('');
    setShowReply(false);
  }

  function handleClickZone(direction: 'prev' | 'next' | 'pause') {
    if (direction === 'prev') goPrev();
    else if (direction === 'next') goNext();
    else setPaused((p) => !p);
  }

  if (!story) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-[width] duration-75 ease-linear"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-20 flex items-center gap-3 px-4">
        <UserAvatar photoURL={story.userPhoto} displayName={story.userName} size="sm" />
        <div className="flex-1">
          <p className="text-white text-[14px] font-semibold">{story.userName}</p>
          <p className="text-white/60 text-[11px]">{new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
          <HiOutlineXMark className="w-5 h-5" />
        </button>
      </div>

      {/* Media */}
      <div className="absolute inset-0 flex items-center justify-center">
        {story.type === 'image' ? (
          <img src={story.mediaURL} className="w-full h-full object-cover" alt="" />
        ) : (
          <video ref={videoRef} src={story.mediaURL} onLoadedMetadata={handleVideoMetadata} playsInline muted className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />
      </div>

      {/* Text overlay */}
      {story.text && (
        <div className="absolute bottom-24 left-0 right-0 z-20 text-center px-8">
          <p className="text-white text-lg font-semibold drop-shadow-lg">{story.text}</p>
        </div>
      )}

      {/* Tap zones: left=prev, center=toggle pause, right=next */}
      <div className="absolute inset-0 z-10 flex">
        <button onClick={() => handleClickZone('prev')} className="w-1/3 h-full" aria-label="Previous" />
        <button onClick={() => handleClickZone('pause')} className="w-1/3 h-full" aria-label="Toggle pause" />
        <button onClick={() => handleClickZone('next')} className="w-1/3 h-full" aria-label="Next" />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-6 px-4">
        {/* Paused indicator */}
        {paused && (
          <div className="flex justify-center mb-2">
            <span className="px-3 py-1 rounded-full bg-white/15 text-white/70 text-[11px] font-medium backdrop-blur-sm">
              Paused
            </span>
          </div>
        )}

        {/* View & like counts */}
        <div className="flex items-center gap-4 mb-3 px-1">
          <span className="flex items-center gap-1.5 text-white/70 text-[13px]">
            <HiOutlineEye className="w-4 h-4" />
            {story.seenBy?.length || 0}
          </span>
          <button onClick={() => {
            if (!user || !story) return;
            const liked = story.likes?.includes(user.uid);
            if (liked) unlikeStory(story.id);
            else likeStory(story.id);
          }}
            className="flex items-center gap-1.5 text-[13px] active:scale-90 transition-transform">
            <HiOutlineHeart className={`w-4 h-4 ${story.likes?.includes(user?.uid || '') ? 'fill-red-500 text-red-500' : 'text-white/70'}`} />
            <span className={story.likes?.includes(user?.uid || '') ? 'text-red-400' : 'text-white/70'}>{story.likes?.length || 0}</span>
          </button>
        </div>

        {/* Reply */}
        {showReply ? (
          <div className="flex items-center gap-2">
            <input autoFocus type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleReply(); }}
              placeholder="Reply to story..."
              className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-[14px] placeholder-white/50 focus:outline-none" />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleReply}
              className="w-11 h-11 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center">
              <HiOutlinePaperAirplane className="w-5 h-5 -rotate-45" />
            </motion.button>
          </div>
        ) : (
          <button onClick={() => setShowReply(true)}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/60 text-[14px] text-left">
            Reply...
          </button>
        )}
      </div>
    </motion.div>
  );
}
