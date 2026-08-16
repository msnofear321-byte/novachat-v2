import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePhone, HiOutlineVideoCamera, HiOutlineMicrophone,
  HiOutlineVideoCameraSlash, HiOutlinePhoneXMark,
  HiOutlineSpeakerWave, HiOutlineArrowsRightLeft,
} from 'react-icons/hi2';
import {
  startCall, answerCall, endCall, rejectCall, cancelCall, cleanupCall,
  subscribeToCall, subscribeToIncomingCalls, toggleMuteLocal,
  toggleCameraLocal, switchCameraLocal, getUserProfile,
  getLocalStream, getRemoteStream, onRemoteStreamChange, onLocalStreamChange,
  type CallData, type RemoteStreamInfo,
} from '@/services/calls';
import { useAuth } from '@/context/AuthContext';

// ── Ringtone via Web Audio API ────────────────────────

let ringtoneCtx: AudioContext | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneGain: GainNode | null = null;

function playRingtone() {
  try {
    stopRingtone();
    ringtoneCtx = new AudioContext();
    const osc1 = ringtoneCtx.createOscillator();
    const osc2 = ringtoneCtx.createOscillator();
    ringtoneGain = ringtoneCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = 440;
    osc2.type = 'sine';
    osc2.frequency.value = 480;

    ringtoneGain.gain.value = 0.15;

    osc1.connect(ringtoneGain);
    osc2.connect(ringtoneGain);
    ringtoneGain.connect(ringtoneCtx.destination);

    osc1.start();
    osc2.start();

    ringtoneCtx.resume().catch(() => {});

    // If resume is blocked by autoplay policy, try to resume on next user gesture
    function resumeOnGesture() {
      try { ringtoneCtx?.resume(); } catch { /* ignore */ }
      document.removeEventListener('click', resumeOnGesture);
      document.removeEventListener('keydown', resumeOnGesture);
    }
    document.addEventListener('click', resumeOnGesture);
    document.addEventListener('keydown', resumeOnGesture);

    ringtoneInterval = setInterval(() => {
      if (ringtoneGain) {
        ringtoneGain.gain.value = ringtoneGain.gain.value > 0 ? 0 : 0.15;
      }
    }, 1000);
  } catch { /* ignore */ }
}

function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneGain) {
    try { ringtoneGain.gain.value = 0; } catch { /* ignore */ }
    ringtoneGain = null;
  }
  if (ringtoneCtx) {
    try { ringtoneCtx.close(); } catch { /* ignore */ }
    ringtoneCtx = null;
  }
}

// ── Helpers ───────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

type CallViewState = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended' | 'missed';

export default function CallModal() {
  const { user } = useAuth();
  const [viewState, setViewState] = useState<CallViewState>('idle');
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [remoteInfo, setRemoteInfo] = useState<RemoteStreamInfo>({
    stream: null, hasVideo: false, cameraOff: false, connecting: true,
  });
  const [callerProfile, setCallerProfile] = useState<{ displayName: string; photoURL: string } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Use ref to track viewState for subscription callbacks (avoids stale closure)
  const viewStateRef = useRef<CallViewState>('idle');
  const callIdRef = useRef<string | null>(null);
  const activeCallRef = useRef<CallData | null>(null);

  const updateViewState = useCallback((state: CallViewState) => {
    viewStateRef.current = state;
    setViewState(state);
  }, []);

  const updateCallId = useCallback((id: string | null) => {
    callIdRef.current = id;
    setCallId(id);
  }, []);

  const syncMedia = useCallback(() => {
    const local = getLocalStream();
    const remote = getRemoteStream();
    if (localVideoRef.current) localVideoRef.current.srcObject = local;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
    // Play remote media. Answering/receiving is a user gesture, so call play()
    // here; if the browser still blocks it, retry on the next user gesture.
    [remoteVideoRef.current, remoteAudioRef.current].forEach((el) => {
      if (el && el.srcObject) {
        const p = el.play();
        if (p) {
          p.catch(() => {
            const resume = () => {
              el.play().catch(() => {});
              window.removeEventListener('touchstart', resume);
              window.removeEventListener('click', resume);
            };
            window.addEventListener('touchstart', resume);
            window.addEventListener('click', resume);
          });
        }
      }
    });
  }, []);

  // Keep activeCall mirrored for subscription callbacks
  const setActiveCallBoth = useCallback((call: CallData | null) => {
    activeCallRef.current = call;
    setActiveCall(call);
  }, []);

  const cleanupUI = useCallback(() => {
    updateViewState('idle');
    setActiveCallBoth(null);
    updateCallId(null);
    setMuted(false);
    setVideoEnabled(true);
    setSpeakerOn(false);
    setElapsed(0);
    setErrorMsg(null);
    setEndReason(null);
    setCallType(null);
    setCallerProfile(null);
    setRemoteInfo({ stream: null, hasVideo: false, cameraOff: false, connecting: true });
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, [updateViewState, updateCallId, setActiveCallBoth]);

  const isVideo = callType === 'video' || activeCall?.type === 'video';

  // ── Listen for incoming calls ────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToIncomingCalls(user.uid, async (call) => {
      const currentView = viewStateRef.current;

      if (call && call.status === 'ringing') {
        // If we're already in a call or outgoing, auto-reject
        if (currentView === 'outgoing' || currentView === 'connected' || currentView === 'incoming') {
          console.log('[CallModal] Already in call, auto-rejecting incoming');
          rejectCall(call.id).catch(() => {});
          return;
        }

        console.log('[CallModal] Incoming call from:', call.callerName, call.callerId);

        // Fetch caller profile for accurate name/photo
        const profile = await getUserProfile(call.callerId);
        if (profile) {
          setCallerProfile(profile);
        }

        setActiveCallBoth(call);
        setCallType(call.type);
        updateCallId(call.id);
        updateViewState('incoming');
        playRingtone();

        // Browser notification
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Incoming ${call.type} call`, {
              body: `${profile?.displayName || call.callerName || 'Unknown'} is calling you`,
              icon: profile?.photoURL || call.callerPhoto || undefined,
              tag: 'incoming-call',
              requireInteraction: true,
            });
          }
        } catch { /* ignore */ }
      } else if (!call && currentView === 'incoming') {
        // Call was cancelled or missed
        stopRingtone();
        cleanupUI();
      }
    });

    return () => {
      unsub();
      stopRingtone();
    };
  }, [user?.uid, cleanupUI, updateViewState, updateCallId, setActiveCallBoth]);

  // ── Subscribe to active call state changes ───────────
  useEffect(() => {
    if (!callId) return;

    const unsub = subscribeToCall(callId, (call) => {
      if (!call) {
        if (viewStateRef.current !== 'idle') {
          stopRingtone();
          cleanupCall();
          cleanupUI();
        }
        return;
      }

      setActiveCallBoth(call);

      if (call.status === 'connected' && viewStateRef.current !== 'connected') {
        updateViewState('connected');
        stopRingtone();
        syncMedia();
      }

      if (call.status === 'ended' || call.status === 'rejected' || call.status === 'missed' || call.status === 'cancelled') {
        stopRingtone();
        cleanupCall();
        if (call.status === 'missed') updateViewState('missed');
        else updateViewState('ended');
        setTimeout(cleanupUI, 2500);
      }
    });

    return unsub;
  }, [callId, cleanupUI, updateViewState, setActiveCallBoth, syncMedia]);

  // ── React to remote/local stream changes ─────────────
  useEffect(() => {
    const unsubRemote = onRemoteStreamChange((info) => {
      setRemoteInfo(info);
      syncMedia();
    });
    const unsubLocal = onLocalStreamChange(() => {
      syncMedia();
    });
    return () => {
      unsubRemote();
      unsubLocal();
    };
  }, [syncMedia]);

  // Sync media elements on state changes (elements mount/unmount)
  useEffect(() => {
    syncMedia();
  }, [viewState, callId, isVideo, remoteInfo, syncMedia]);

  // ── Timer for connected state ────────────────────────
  useEffect(() => {
    if (viewState === 'connected') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [viewState]);

  // ── Listen for call-start event from ChatPage ────────
  useEffect(() => {
    function handleCallStart(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.receiverId && detail?.type) {
        handleStartCall(detail.receiverId, detail.receiverName || 'Unknown', detail.receiverPhoto || '', detail.type);
      }
    }
    window.addEventListener('call-start', handleCallStart);
    return () => window.removeEventListener('call-start', handleCallStart);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen for call-ended event ──────────────────────
  useEffect(() => {
    function handleCallEnded(e: Event) {
      const reason = (e as CustomEvent).detail?.reason;
      stopRingtone();
      cleanupCall();
      if (reason) setEndReason(reason);
      updateViewState('ended');
      setTimeout(cleanupUI, 2500);
    }
    window.addEventListener('call-ended', handleCallEnded);
    return () => window.removeEventListener('call-ended', handleCallEnded);
  }, [cleanupUI, updateViewState]);

  // ── Request notification permission on mount ─────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Handlers ─────────────────────────────────────────

  async function handleStartCall(receiverId: string, receiverName: string, receiverPhoto: string, type: 'voice' | 'video') {
    setErrorMsg(null);
    setCallType(type);
    updateViewState('outgoing');
    try {
      const id = await startCall(receiverId, receiverName, receiverPhoto, type);
      updateCallId(id);
      syncMedia();
    } catch (err) {
      console.error('[CallModal] Failed to start call:', err);
      const msg = err instanceof Error ? err.message : 'Failed to start call';
      setErrorMsg(msg);
      updateViewState('ended');
      setTimeout(cleanupUI, 3000);
    }
  }

  async function handleAnswerCall(video: boolean) {
    if (!activeCall) return;
    stopRingtone();
    setCallerProfile(null);
    setCallType(video ? 'video' : 'voice');
    try {
      await answerCall(activeCall.id, video);
      syncMedia();
    } catch (err) {
      console.error('[CallModal] Failed to answer call:', err);
      const msg = err instanceof Error ? err.message : 'Call connection failed';
      setErrorMsg(msg);
      updateViewState('ended');
      setTimeout(cleanupUI, 2500);
    }
  }

  async function handleEndCall() {
    if (callId) await endCall(callId);
    stopRingtone();
    updateViewState('ended');
    setTimeout(cleanupUI, 1500);
  }

  async function handleRejectCall() {
    if (activeCall) await rejectCall(activeCall.id);
    stopRingtone();
    cleanupUI();
  }

  async function handleCancelCall() {
    if (callId) await cancelCall(callId);
    stopRingtone();
    cleanupUI();
  }

  async function handleToggleMute() {
    const isMuted = await toggleMuteLocal();
    setMuted(isMuted);
  }

  async function handleToggleCamera() {
    const enabled = await toggleCameraLocal();
    setVideoEnabled(enabled);
  }

  async function handleSwitchCamera() {
    await switchCameraLocal();
  }

  async function handleToggleSpeaker() {
    setSpeakerOn(!speakerOn);
  }

  // ── Render ──────────────────────────────────────────

  if (viewState === 'idle') return null;

  // Determine name/photo to display
  let displayName = 'Unknown';
  let displayPhoto = '';

  if (viewState === 'incoming') {
    // For incoming: show caller's info
    displayName = callerProfile?.displayName || activeCall?.callerName || 'Unknown';
    displayPhoto = callerProfile?.photoURL || activeCall?.callerPhoto || '';
  } else if (viewState === 'outgoing') {
    // For outgoing: show receiver's info
    displayName = activeCall?.receiverName || 'Unknown';
    displayPhoto = activeCall?.receiverPhoto || '';
  } else {
    // For connected/ended: show the other party
    displayName = callerProfile?.displayName
      || (viewState === 'connected' ? (activeCall?.callerId === user?.uid ? activeCall?.receiverName : activeCall?.callerName) : activeCall?.callerName)
      || 'Unknown';
    displayPhoto = callerProfile?.photoURL
      || (viewState === 'connected' ? (activeCall?.callerId === user?.uid ? activeCall?.receiverPhoto : activeCall?.callerPhoto) : activeCall?.callerPhoto)
      || '';
  }

  return (
    <AnimatePresence>
      <motion.div
        key="call-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%)' }}
      >
        {/* Background particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${10 + (i * 6) % 90}%`,
                top: `${5 + (i * 7) % 85}%`,
                width: (i % 3) + 1,
                height: (i % 3) + 1,
                background: i % 2 === 0 ? 'var(--accent-glow)' : 'var(--accent-glow-strong)',
              }}
              animate={{
                y: [0, -(i * 3 + 10), 0],
                opacity: [0.15, 0.6, 0.15],
              }}
              transition={{
                duration: (i % 5) + 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (i % 4) * 0.75,
              }}
            />
          ))}
        </div>

        {/* Video background (connected video call) */}
        {viewState === 'connected' && isVideo && (
          <div className="absolute inset-0 bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {(remoteInfo.connecting || remoteInfo.cameraOff || !remoteInfo.hasVideo) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f]">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/15 mb-4">
                  {displayPhoto ? (
                    <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-secondary)]/30 flex items-center justify-center text-white text-3xl font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="text-white/60 text-sm">
                  {remoteInfo.connecting ? 'Connecting…' : 'Camera off'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Remote audio for voice calls (hidden) */}
        {viewState === 'connected' && !isVideo && (
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        )}

        <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-[420px] px-8">
          {/* User info + status */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4"
          >
            {/* Avatar with animated rings */}
            <div className="relative">
              {(viewState === 'outgoing' || viewState === 'incoming') && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.6, 1.6], opacity: [0.4, 0, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)]/40"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.4, 1.4], opacity: [0.3, 0, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                    className="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)]/30"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1.2], opacity: [0.2, 0, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
                    className="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)]/20"
                  />
                </>
              )}
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/10"
                style={{ boxShadow: 'var(--shadow-glow)' }}>
                {displayPhoto ? (
                  <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-secondary)]/30 flex items-center justify-center text-white text-4xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1">{displayName}</h2>
              <p className={`text-sm font-medium ${
                viewState === 'connected' ? 'text-emerald-400' :
                viewState === 'outgoing' ? 'text-[var(--accent-secondary)]' :
                viewState === 'incoming' ? 'text-[var(--accent-secondary)]' :
                'text-white/40'
              }`}>
                {viewState === 'outgoing' && 'Calling...'}
                {viewState === 'incoming' && (isVideo ? 'Incoming video call' : 'Incoming voice call')}
                {viewState === 'connected' && formatDuration(elapsed)}
                {viewState === 'ended' && (endReason || errorMsg || 'Call ended')}
                {viewState === 'missed' && 'Missed call'}
              </p>
            </div>
          </motion.div>

          {/* Local video PIP (video call, outgoing + connected state) */}
          {isVideo && (viewState === 'outgoing' || viewState === 'connected') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 z-20 bg-black"
              style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
            >
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {!videoEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f]">
                  <HiOutlineVideoCameraSlash className="w-7 h-7 text-white/50 mb-1" />
                  <p className="text-white/50 text-[11px]">Camera off</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Controls */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center gap-5"
          >
            {/* INCOMING: Reject + Accept */}
            {viewState === 'incoming' && (
              <>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRejectCall}
                  className="w-[68px] h-[68px] rounded-full bg-red-500 text-white flex items-center justify-center"
                  style={{ boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}
                >
                  <HiOutlinePhoneXMark className="w-8 h-8" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleAnswerCall(false)}
                  className="w-[68px] h-[68px] rounded-full bg-emerald-500 text-white flex items-center justify-center"
                  style={{ boxShadow: '0 0 30px rgba(34,197,94,0.4)' }}
                >
                  <HiOutlinePhone className="w-8 h-8" />
                </motion.button>
                {isVideo && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleAnswerCall(true)}
                    className="w-[68px] h-[68px] rounded-full bg-cyan-500 text-white flex items-center justify-center"
                    style={{ boxShadow: '0 0 30px rgba(6,182,212,0.4)' }}
                  >
                    <HiOutlineVideoCamera className="w-8 h-8" />
                  </motion.button>
                )}
              </>
            )}

            {/* OUTGOING: Cancel */}
            {viewState === 'outgoing' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCancelCall}
                className="w-[68px] h-[68px] rounded-full bg-red-500 text-white flex items-center justify-center"
                style={{ boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}
              >
                <HiOutlinePhoneXMark className="w-8 h-8" />
              </motion.button>
            )}

            {/* CONNECTED: Full controls */}
            {viewState === 'connected' && (
              <>
                {/* Mute */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    muted ? 'bg-white text-gray-900' : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                  style={{ boxShadow: muted ? '0 0 20px rgba(255,255,255,0.2)' : 'none' }}
                >
                  {muted ? <HiOutlineMicrophone className="w-6 h-6 line-through" /> : <HiOutlineMicrophone className="w-6 h-6" />}
                </motion.button>

                {/* Speaker (voice call only) */}
                {!isVideo && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleToggleSpeaker}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      speakerOn ? 'bg-[var(--accent-primary)] text-white' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                    style={{ boxShadow: speakerOn ? '0 0 20px var(--accent-glow)' : 'none' }}
                  >
                    <HiOutlineSpeakerWave className="w-6 h-6" />
                  </motion.button>
                )}

                {/* Camera toggle (video call only) */}
                {isVideo && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleToggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      !videoEnabled ? 'bg-white text-gray-900' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {videoEnabled ? <HiOutlineVideoCamera className="w-6 h-6" /> : <HiOutlineVideoCameraSlash className="w-6 h-6" />}
                  </motion.button>
                )}

                {/* Switch camera (video call only) */}
                {isVideo && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSwitchCamera}
                    className="w-14 h-14 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-all"
                  >
                    <HiOutlineArrowsRightLeft className="w-6 h-6" />
                  </motion.button>
                )}

                {/* End call */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleEndCall}
                  className="w-[68px] h-[68px] rounded-full bg-red-500 text-white flex items-center justify-center"
                  style={{ boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}
                >
                  <HiOutlinePhoneXMark className="w-8 h-8" />
                </motion.button>
              </>
            )}

            {/* ENDED/MISSED: just show status */}
            {(viewState === 'ended' || viewState === 'missed') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-white/40 text-sm">This call has ended</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
