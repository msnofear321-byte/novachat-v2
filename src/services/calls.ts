import {
  collection, doc, setDoc, addDoc, onSnapshot, updateDoc, getDoc, getDocs,
  deleteDoc, query, where, type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { isOnlineNow } from './presence';
import type { User } from '@/types';

export interface CallData {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'connected' | 'ended' | 'rejected' | 'missed' | 'cancelled';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  duration?: number;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

const CALL_TIMEOUT_MS = 60000;
const CONNECT_TIMEOUT_MS = 30000;
const ICE_RETRY_MS = 5000;

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let currentCallId: string | null = null;
let callTimer: ReturnType<typeof setTimeout> | null = null;
let connectTimer: ReturnType<typeof setTimeout> | null = null;
let iceFailedTimer: ReturnType<typeof setTimeout> | null = null;
let callBusy = false;
let remoteEverHadVideo = false;
let iceCandidateUnsubs: Unsubscribe[] = [];
let callUnsub: Unsubscribe | null = null;
let incomingUnsub: Unsubscribe | null = null;
let pendingICECandidates: RTCIceCandidateInit[] = [];
let remoteDescSet = false;

export interface RemoteStreamInfo {
  stream: MediaStream | null;
  hasVideo: boolean;
  cameraOff: boolean;
  connecting: boolean;
}

const remoteListeners = new Set<(info: RemoteStreamInfo) => void>();
const localListeners = new Set<(stream: MediaStream | null) => void>();

function getRemoteInfo(): RemoteStreamInfo {
  if (!remoteStream) return { stream: null, hasVideo: false, cameraOff: false, connecting: false };
  const vt = remoteStream.getVideoTracks()[0];
  const hasVideo = !!vt && vt.readyState === 'live';
  const cameraOff = hasVideo && (vt.enabled === false || vt.muted === true);
  return {
    stream: remoteStream,
    hasVideo,
    cameraOff,
    connecting: !hasVideo && !remoteEverHadVideo,
  };
}

function notifyRemote() {
  const info = getRemoteInfo();
  remoteListeners.forEach((l) => { try { l(info); } catch { /* ignore */ } });
}

function notifyLocal() {
  localListeners.forEach((l) => { try { l(localStream); } catch { /* ignore */ } });
}

/** Subscribe to remote stream changes (tracks added/removed, camera toggled). */
export function onRemoteStreamChange(cb: (info: RemoteStreamInfo) => void): Unsubscribe {
  remoteListeners.add(cb);
  return () => { remoteListeners.delete(cb); };
}

/** Subscribe to local stream changes (created on call start / cleared on cleanup). */
export function onLocalStreamChange(cb: (stream: MediaStream | null) => void): Unsubscribe {
  localListeners.add(cb);
  return () => { localListeners.delete(cb); };
}

function clearConnectTimer() {
  if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
}

function clearIceFailedTimer() {
  if (iceFailedTimer) { clearTimeout(iceFailedTimer); iceFailedTimer = null; }
}

function startConnectTimer(callId: string) {
  clearConnectTimer();
  connectTimer = setTimeout(() => {
    connectTimer = null;
    if (currentCallId !== callId) return;
    console.warn('[Call] Connection timed out, ending call', callId);
    endCall(callId, 'Unable to connect. Please try again.');
  }, CONNECT_TIMEOUT_MS);
}

function startIceRecovery() {
  if (iceFailedTimer) return;
  iceFailedTimer = setTimeout(() => {
    iceFailedTimer = null;
    const pc = peerConnection;
    if (!pc || currentCallId === null) return;
    const iceState = pc.iceConnectionState;
    if (iceState === 'disconnected' || iceState === 'connected') {
      console.log('[Call] ICE stalled, attempting restart');
      try { pc.restartIce(); } catch { /* ignore */ }
      iceFailedTimer = setTimeout(() => {
        iceFailedTimer = null;
        if (currentCallId) {
          console.warn('[Call] ICE could not recover, ending call');
          endCall(currentCallId, 'Unable to connect. Please try again.');
        }
      }, 15000);
    } else {
      console.warn('[Call] ICE failed, ending call');
      if (currentCallId) endCall(currentCallId, 'Call connection failed. Please try again.');
    }
  }, ICE_RETRY_MS);
}

function markCallConnected() {
  clearConnectTimer();
  clearIceFailedTimer();
  if (!currentCallId) return;
  getDoc(getCallRef(currentCallId))
    .then((snap) => {
      if (snap.exists() && snap.data()?.status !== 'connected' && currentCallId) {
        return updateDoc(getCallRef(currentCallId), { status: 'connected', startedAt: Date.now() });
      }
    })
    .catch(() => {});
}

function getCallRef(callId: string) {
  return doc(db, 'calls', callId);
}

function getCallerCandidatesRef(callId: string) {
  return collection(db, 'calls', callId, 'callerCandidates');
}

function getReceiverCandidatesRef(callId: string) {
  return collection(db, 'calls', callId, 'receiverCandidates');
}

// ── Profile lookup ────────────────────────────────────

export async function getUserProfile(uid: string): Promise<{ displayName: string; photoURL: string } | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        displayName: data.displayName || data.email || 'Unknown',
        photoURL: data.photoURL || '',
      };
    }
  } catch { /* ignore */ }
  return null;
}

// ── Presence check ───────────────────────────────────

export async function isUserOnline(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return isOnlineNow(snap.data() as User);
    }
  } catch { /* ignore */ }
  return false;
}

// ── Stale call cleanup ───────────────────────────────

async function forceCleanup(): Promise<void> {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;

  try {
    const callerQ = query(
      collection(db, 'calls'),
      where('callerId', '==', userId),
      where('status', 'in', ['ringing', 'connected']),
    );
    const callerSnap = await getDocs(callerQ);
    for (const d of callerSnap.docs) {
      const data = d.data();
      if (data.status === 'ringing' || (data.startedAt && Date.now() - data.startedAt > 120000)) {
        try {
          await deleteDoc(doc(db, 'calls', d.id));
        } catch { /* ignore */ }
      }
    }

    const receiverQ = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('status', 'in', ['ringing', 'connected']),
    );
    const receiverSnap = await getDocs(receiverQ);
    for (const d of receiverSnap.docs) {
      const data = d.data();
      if (data.status === 'ringing' || (data.startedAt && Date.now() - data.startedAt > 120000)) {
        try {
          await deleteDoc(doc(db, 'calls', d.id));
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

// ── WebRTC helpers ───────────────────────────────────

function createPeerConnection(): RTCPeerConnection {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  remoteStream = new MediaStream();
  pendingICECandidates = [];
  remoteDescSet = false;

  pc.ontrack = (event) => {
    const incoming = event.streams && event.streams[0];
    if (incoming && remoteStream) {
      incoming.getTracks().forEach((track) => {
        if (!remoteStream!.getTracks().some((t) => t.id === track.id)) {
          if (track.kind === 'video') remoteEverHadVideo = true;
          remoteStream!.addTrack(track);
          track.addEventListener('muted', notifyRemote);
          track.addEventListener('unmuted', notifyRemote);
          track.addEventListener('ended', notifyRemote);
          console.log('[Call] Remote track attached:', track.kind, track.id);
        }
      });
    }
    notifyRemote();
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    console.log('[Call] connectionState:', state);
    if (state === 'connected') {
      markCallConnected();
    } else if (state === 'failed') {
      console.warn('[Call] connectionState failed');
      if (currentCallId) endCall(currentCallId, 'Call connection failed. Please try again.');
    } else if (state === 'disconnected') {
      startIceRecovery();
    }
  };

  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    console.log('[Call] iceConnectionState:', state);
    if (state === 'connected' || state === 'completed') {
      clearIceFailedTimer();
      clearConnectTimer();
      markCallConnected();
    } else if (state === 'failed') {
      startIceRecovery();
    } else if (state === 'disconnected') {
      startIceRecovery();
    }
  };

  return pc;
}

async function addPendingCandidates(pc: RTCPeerConnection) {
  for (const c of pendingICECandidates) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    } catch { /* ignore */ }
  }
  pendingICECandidates = [];
}

function subscribeIceCandidates(
  pc: RTCPeerConnection,
  callId: string,
  role: 'caller' | 'receiver',
): Unsubscribe {
  const candidatesRef = role === 'caller'
    ? getCallerCandidatesRef(callId)
    : getReceiverCandidatesRef(callId);

  return onSnapshot(candidatesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        if (remoteDescSet) {
          try {
            pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
          } catch { /* ignore */ }
        } else {
          pendingICECandidates.push(data);
        }
      }
    });
  });
}

function setupLocalTracks(pc: RTCPeerConnection, stream: MediaStream) {
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });
}

async function deleteSubcollections(callId: string) {
  try {
    const callerCandidatesRef = getCallerCandidatesRef(callId);
    const callerSnap = await getDocs(callerCandidatesRef);
    for (const d of callerSnap.docs) {
      try { await deleteDoc(d.ref); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  try {
    const receiverCandidatesRef = getReceiverCandidatesRef(callId);
    const receiverSnap = await getDocs(receiverCandidatesRef);
    for (const d of receiverSnap.docs) {
      try { await deleteDoc(d.ref); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

function cleanup() {
  console.log('[Call] Cleaning up');

  if (callUnsub) { callUnsub(); callUnsub = null; }
  if (incomingUnsub) { incomingUnsub(); incomingUnsub = null; }

  if (peerConnection) {
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.onicecandidateerror = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.oniceconnectionstatechange = null;
    try { peerConnection.close(); } catch { /* ignore */ }
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((t) => {
      try { t.stop(); } catch { /* ignore */ }
      t.enabled = false;
    });
    localStream = null;
  }

  remoteStream = null;
  remoteEverHadVideo = false;
  pendingICECandidates = [];
  remoteDescSet = false;

  iceCandidateUnsubs.forEach((unsub) => unsub());
  iceCandidateUnsubs = [];

  clearConnectTimer();
  clearIceFailedTimer();
  if (callTimer) {
    clearTimeout(callTimer);
    callTimer = null;
  }

  currentCallId = null;

  notifyRemote();
  notifyLocal();
}

// ── Public API ─────────────────────────────────────

export function getLocalStream(): MediaStream | null {
  return localStream;
}

export function getRemoteStream(): MediaStream | null {
  return remoteStream;
}

export function getCurrentCallId(): string | null {
  return currentCallId;
}

export async function startCall(
  receiverId: string,
  receiverName: string,
  receiverPhoto: string,
  type: 'voice' | 'video',
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  if (callBusy || currentCallId) {
    console.warn('[Call] Already in a call, ignoring startCall');
    throw new Error('Already in a call');
  }
  callBusy = true;

  try {
    await forceCleanup();

    const callerProfile = await getUserProfile(user.uid);
    const callerName = callerProfile?.displayName || user.displayName || 'Unknown';
    const callerPhoto = callerProfile?.photoURL || user.photoURL || '';

    const receiverProfile = await getUserProfile(receiverId);
    const resolvedReceiverName = receiverProfile?.displayName || receiverName || 'Unknown';
    const resolvedReceiverPhoto = receiverProfile?.photoURL || receiverPhoto || '';

    const receiverInCall = await checkUserInCall(receiverId);
    if (receiverInCall) {
      throw new Error('User is busy');
    }

    cleanup();

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true,
      });
    } catch {
      throw new Error(
        type === 'video'
          ? 'Camera permission is required for video calls.'
          : 'Microphone permission is required for calls.',
      );
    }
    notifyLocal();

  peerConnection = createPeerConnection();
  setupLocalTracks(peerConnection, localStream);

  const callId = `${user.uid}_${receiverId}_${Date.now()}`;
  currentCallId = callId;

  const callerCandidatesRef = getCallerCandidatesRef(callId);
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(callerCandidatesRef, event.candidate.toJSON()).catch(() => {});
    }
  };

  peerConnection.onicecandidateerror = (event) => {
    console.warn('[Call] ICE candidate error:', (event as RTCPeerConnectionIceErrorEvent).errorText);
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const iceUnsub = subscribeIceCandidates(peerConnection, callId, 'receiver');
  iceCandidateUnsubs.push(iceUnsub);

  callUnsub = onSnapshot(getCallRef(callId), (snap) => {
    const data = snap.data();
    if (!data?.answer || !peerConnection) return;
    if (peerConnection.signalingState !== 'have-local-offer') return;
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(data.answer))
      .then(() => {
        remoteDescSet = true;
        return addPendingCandidates(peerConnection!);
      })
      .then(() => startConnectTimer(callId))
      .catch((err) => console.warn('[Call] Failed to apply remote answer:', err));
  });

  await setDoc(getCallRef(callId), {
    callerId: user.uid,
    callerName,
    callerPhoto,
    receiverId,
    receiverName: resolvedReceiverName,
    receiverPhoto: resolvedReceiverPhoto,
    type,
    status: 'ringing',
    offer: { sdp: offer.sdp, type: offer.type },
    createdAt: Date.now(),
  });

  console.log('[Call] Call created:', callId, 'to:', resolvedReceiverName);

  callTimer = setTimeout(async () => {
    if (currentCallId === callId) {
      try {
        const snap = await getDoc(getCallRef(callId));
        const currentStatus = snap.data()?.status;
        if (currentStatus === 'connected') {
          callTimer = null;
          return;
        }
      } catch { /* ignore */ }
      console.log('[Call] Call timed out after', CALL_TIMEOUT_MS, 'ms');
      try {
        await updateDoc(getCallRef(callId), { status: 'missed', endedAt: Date.now() });
      } catch { /* ignore */ }
      endCall(callId, 'No answer. Please try again.');
    }
  }, CALL_TIMEOUT_MS);

    return callId;
  } finally {
    callBusy = false;
  }
}

async function checkUserInCall(userId: string): Promise<boolean> {
  try {
    const callerQ = query(
      collection(db, 'calls'),
      where('callerId', '==', userId),
      where('status', 'in', ['ringing', 'connected']),
    );
    const callerSnap = await getDocs(callerQ);
    if (!callerSnap.empty) return true;

    const receiverQ = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('status', 'in', ['ringing', 'connected']),
    );
    const receiverSnap = await getDocs(receiverQ);
    if (!receiverSnap.empty) return true;
  } catch { /* ignore */ }
  return false;
}

export function subscribeToCall(
  callId: string,
  callback: (call: CallData | null) => void,
): Unsubscribe {
  return onSnapshot(getCallRef(callId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as CallData);
    } else {
      callback(null);
    }
  });
}

export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: CallData | null) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'calls'),
    where('receiverId', '==', userId),
    where('status', '==', 'ringing'),
  );

  return onSnapshot(q, (snapshot) => {
    const incoming = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as CallData))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;

    callback(incoming);
  });
}

export async function answerCall(
  callId: string,
  video: boolean = false,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  if (callBusy || currentCallId) {
    console.warn('[Call] Already in a call, cannot answer:', callId);
    throw new Error('Already in a call');
  }
  callBusy = true;

  console.log('[Call] Answering call:', callId);

  try {
    const callSnap = await getDoc(getCallRef(callId));
    const callData = callSnap.data();
    if (!callData?.offer) {
      throw new Error('Call offer not found');
    }

    cleanup();

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true,
      });
    } catch {
      throw new Error(
        video
          ? 'Camera permission is required for video calls.'
          : 'Microphone permission is required for calls.',
      );
    }
    notifyLocal();

    peerConnection = createPeerConnection();
    setupLocalTracks(peerConnection, localStream);
    currentCallId = callId;

    const receiverCandidatesRef = getReceiverCandidatesRef(callId);
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(receiverCandidatesRef, event.candidate.toJSON()).catch(() => {});
      }
    };

    peerConnection.onicecandidateerror = (event) => {
      console.warn('[Call] ICE candidate error:', (event as RTCPeerConnectionIceErrorEvent).errorText);
    };

    const iceUnsub = subscribeIceCandidates(peerConnection, callId, 'caller');
    iceCandidateUnsubs.push(iceUnsub);

    if (peerConnection.signalingState !== 'stable') {
      console.warn('[Call] Signaling state not stable, rolling back');
      await peerConnection.setLocalDescription({ type: 'rollback' });
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
    remoteDescSet = true;

    await addPendingCandidates(peerConnection);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await updateDoc(getCallRef(callId), {
      answer: { sdp: answer.sdp, type: answer.type },
      status: 'connected',
      startedAt: Date.now(),
    });

    console.log('[Call] Call answered and connected:', callId);

    startConnectTimer(callId);
  } finally {
    callBusy = false;
  }
}

export async function endCall(callId: string, reason?: string): Promise<void> {
  const endedAt = Date.now();
  let duration = 0;
  let statusToSet = 'ended';

  try {
    const snap = await getDoc(getCallRef(callId));
    const data = snap.data();
    if (data?.startedAt) {
      duration = Math.floor((endedAt - data.startedAt) / 1000);
    }
    if (data?.status === 'ringing' || data?.status === 'missed') {
      statusToSet = data?.callerId === auth.currentUser?.uid ? 'cancelled' : 'missed';
    }
  } catch { /* ignore */ }

  cleanup();

  try {
    const snap = await getDoc(getCallRef(callId));
    if (snap.exists()) {
      const data = snap.data();
      await updateDoc(getCallRef(callId), {
        status: statusToSet,
        endedAt,
        duration,
      });

      if (data?.status === 'connected' || data?.status === 'ringing') {
        await saveCallHistory(callId, { ...data, id: callId, status: statusToSet } as CallData, duration, endedAt);
      }
    }
  } catch { /* ignore */ }

  try {
    await deleteSubcollections(callId);
  } catch { /* ignore */ }

  window.dispatchEvent(new CustomEvent('call-ended', { detail: { callId, reason } }));
}

export async function rejectCall(callId: string): Promise<void> {
  cleanup();

  try {
    const snap = await getDoc(getCallRef(callId));
    if (snap.exists()) {
      const data = snap.data();
      await updateDoc(getCallRef(callId), {
        status: 'rejected',
        endedAt: Date.now(),
      });
      await saveCallHistory(callId, { ...data, id: callId, status: 'rejected' } as CallData, 0, Date.now());
    }
  } catch { /* ignore */ }

  try {
    await deleteSubcollections(callId);
  } catch { /* ignore */ }

  window.dispatchEvent(new CustomEvent('call-ended', { detail: { callId } }));
}

export async function cancelCall(callId: string): Promise<void> {
  cleanup();

  try {
    const snap = await getDoc(getCallRef(callId));
    if (snap.exists()) {
      const data = snap.data();
      await updateDoc(getCallRef(callId), { status: 'cancelled', endedAt: Date.now() });
      await saveCallHistory(callId, { ...data, id: callId, status: 'cancelled' } as CallData, 0, Date.now());
    }
  } catch { /* ignore */ }

  try {
    await deleteSubcollections(callId);
  } catch { /* ignore */ }

  window.dispatchEvent(new CustomEvent('call-ended', { detail: { callId } }));
}

export async function toggleMuteLocal(): Promise<boolean> {
  if (!localStream) return false;
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    return !audioTrack.enabled;
  }
  return false;
}

export async function toggleCameraLocal(): Promise<boolean> {
  if (!localStream) return false;
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    return videoTrack.enabled;
  }
  return false;
}

export async function switchCameraLocal(): Promise<void> {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return;

  const wasEnabled = videoTrack.enabled;
  const settings = videoTrack.getSettings();
  const facingMode = settings.facingMode === 'user' ? 'environment' : 'user';

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode },
    audio: false,
  });

  const newTrack = newStream.getVideoTracks()[0];
  newTrack.enabled = wasEnabled;

  if (peerConnection) {
    const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(newTrack);
  }

  videoTrack.stop();
  localStream.removeTrack(videoTrack);
  localStream.addTrack(newTrack);
  newStream.getAudioTracks().forEach((t) => t.stop());
  notifyLocal();
}

// ── Call History ───────────────────────────────────

async function saveCallHistory(
  callId: string,
  data: CallData,
  duration: number,
  endedAt: number,
): Promise<void> {
  try {
    await setDoc(doc(db, 'callHistory', callId), {
      callId,
      callerId: data.callerId,
      callerName: data.callerName,
      callerPhoto: data.callerPhoto,
      receiverId: data.receiverId,
      receiverName: data.receiverName,
      receiverPhoto: data.receiverPhoto,
      type: data.type,
      status: data.status,
      duration,
      endedAt,
      createdAt: data.createdAt || endedAt,
    });
  } catch { /* ignore */ }
}

export async function getCallHistory(userId: string): Promise<CallData[]> {
  const callerQ = query(
    collection(db, 'callHistory'),
    where('callerId', '==', userId),
  );
  const receiverQ = query(
    collection(db, 'callHistory'),
    where('receiverId', '==', userId),
  );

  const [callerSnap, receiverSnap] = await Promise.all([getDocs(callerQ), getDocs(receiverQ)]);

  const all = [
    ...callerSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CallData)),
    ...receiverSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CallData)),
  ];

  return all.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
}

export function cleanupCall() {
  cleanup();
}

// ── Cleanup on page unload ─────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (currentCallId) {
      try {
        updateDoc(getCallRef(currentCallId), { status: 'ended', endedAt: Date.now() }).catch(() => {});
      } catch { /* ignore */ }
    }
    cleanup();
  });
}
