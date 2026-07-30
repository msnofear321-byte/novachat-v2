import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineMapPin, HiOutlineXMark, HiOutlineArrowTopRightOnSquare,
  HiOutlineClock, HiOutlineStop,
} from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import {
  doc, setDoc, onSnapshot, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';

interface LiveLocationProps {
  conversationId: string;
  onClose?: () => void;
  isGroup?: boolean;
}

interface LocationData {
  lat: number;
  lng: number;
  userId: string;
  userName: string;
  updatedAt: number;
  expiresAt: number;
}

export default function LiveLocationPanel({ conversationId, onClose, isGroup = false }: LiveLocationProps) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(30);
  const watchIdRef = useRef<number | null>(null);

  const docPath = isGroup
    ? `liveLocations/group_${conversationId}`
    : `liveLocations/${conversationId}`;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'liveLocations', isGroup ? `group_${conversationId}` : conversationId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as LocationData;
        if (data.expiresAt > Date.now()) {
          setLocation(data);
        } else {
          setLocation(null);
        }
      } else {
        setLocation(null);
      }
    });
    return () => unsub();
  }, [conversationId, isGroup]);

  const startSharing = () => {
    if (!navigator.geolocation || !user) {
      setError('Geolocation not available');
      return;
    }

    setError('');
    setSharing(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const data: LocationData = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          userId: user.uid,
          userName: user.displayName || user.email || 'User',
          updatedAt: Date.now(),
          expiresAt: Date.now() + duration * 60 * 1000,
        };
        try {
          await setDoc(doc(db, 'liveLocations', isGroup ? `group_${conversationId}` : conversationId), data);
        } catch {}
      },
      (err) => {
        setError('Location access denied');
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const stopSharing = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
    try {
      await deleteDoc(doc(db, 'liveLocations', isGroup ? `group_${conversationId}` : conversationId));
    } catch {}
    setLocation(null);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const mapsUrl = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : null;

  const remaining = location ? Math.max(0, Math.floor((location.expiresAt - Date.now()) / 60000)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-2 p-3 rounded-[14px] border border-[var(--border-primary)]" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HiOutlineMapPin className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-[13px] font-medium text-[var(--text-primary)]">Live Location</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--hover-bg)]">
              <HiOutlineXMark className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          )}
        </div>

        {error && (
          <p className="text-[12px] mb-2" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {!sharing && !location && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HiOutlineClock className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[12px] text-[var(--text-muted)]">Share for:</span>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="px-2 py-1 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[8px] text-[12px] text-[var(--text-primary)] focus:outline-none"
              >
                <option value={5}>5 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
            <button
              onClick={startSharing}
              className="w-full py-2.5 rounded-[12px] text-[13px] font-medium text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gradient-end))' }}
            >
              Start Sharing Location
            </button>
          </div>
        )}

        {(sharing || location) && location && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--text-muted)]">
                {sharing ? 'Sharing live' : `Shared by ${location.userName}`}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                {remaining}m left
              </span>
            </div>
            <div className="rounded-[10px] overflow-hidden border border-[var(--border-primary)]" style={{ height: 160 }}>
              <iframe
                src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div className="flex gap-2">
              <a
                href={mapsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[12px] font-medium text-[var(--accent-primary)] border border-[var(--border-primary)] hover:bg-[var(--hover-bg)]"
              >
                <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
                Open in Maps
              </a>
              {sharing && (
                <button
                  onClick={stopSharing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[12px] font-medium border border-[var(--danger)] hover:bg-[var(--danger-bg)]"
                  style={{ color: 'var(--danger)' }}
                >
                  <HiOutlineStop className="w-3.5 h-3.5" />
                  Stop Sharing
                </button>
              )}
            </div>
          </div>
        )}

        {sharing && !location && (
          <div className="flex items-center gap-2 py-3">
            <div className="w-4 h-4 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
            <span className="text-[12px] text-[var(--text-muted)]">Getting location...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
