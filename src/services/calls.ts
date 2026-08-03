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

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let currentCallId: string | null = null;
let callTimer: ReturnType<typeof setTimeout> | null = null;
let iceCandidateUnsubs: Unsubscribe[] = [];
let callUnsub: Unsubscribe | null = null;
let incomingUnsub: Unsubscribe | null = null;
let pendingICECandidates: RTCIceCandidateInit[] = [];
let remoteDescSet = false;

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
    if (event.streams && event.streams[0]) {
      remoteStream = event.streams[0];
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
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((t) => {
      t.stop();
      t.enabled = false;
    });
    localStream = null;
  }

  remoteStream = null;
  pendingICECandidates = [];
  remoteDescSet = false;

  iceCandidateUnsubs.forEach((unsub) => unsub());
  iceCandidateUnsubs = [];

  if (callTimer) {
    clearTimeout(callTimer);
    callTimer = null;
  }

  currentCallId = null;
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

  if (currentCallId) {
    console.warn('[Call] Already in a call, ignoring startCall');
    throw new Error('Already in a call');
  }

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
    throw new Error('Could not access camera/microphone');
  }

  peerConnection = createPeerConnection();
  setupLocalTracks(peerConnection, localStream);

  const callId = `${user.uid}_${receiverId}_${Date.now()}`;
  currentCallId = callId;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const callerCandidatesRef = getCallerCandidatesRef(callId);
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(callerCandidatesRef, event.candidate.toJSON()).catch(() => {});
    }
  };

  peerConnection.onicecandidateerror = (event) => {
    console.warn('[Call] ICE candidate error:', (event as RTCPeerConnectionIceErrorEvent).errorText);
  };

  const iceUnsub = subscribeIceCandidates(peerConnection, callId, 'caller');
  iceCandidateUnsubs.push(iceUnsub);

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection?.connectionState;
    console.log('[Call] Caller connection state:', state);
    if (state === 'failed') {
      console.log('[Call] Caller connection failed, ending call');
      endCall(callId);
    } else if (state === 'disconnected') {
      console.log('[Call] Caller connection disconnected');
    }
  };

  let iceFailedTimer: ReturnType<typeof setTimeout> | null = null;
  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection?.iceConnectionState;
    console.log('[Call] Caller ICE state:', state);
    if (state === 'failed') {
      if (!iceFailedTimer) {
        iceFailedTimer = setTimeout(() => {
          console.log('[Call] Caller ICE failed for too long, ending call');
          endCall(callId);
        }, 5000);
      }
    } else if (state === 'connected' || state === 'completed') {
      if (iceFailedTimer) {
        clearTimeout(iceFailedTimer);
        iceFailedTimer = null;
      }
    }
  };

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
      cleanup();
      window.dispatchEvent(new CustomEvent('call-ended', { detail: { callId } }));
    }
  }, CALL_TIMEOUT_MS);

  return callId;
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

  console.log('[Call] Answering call:', callId);

  const callSnap = await getDoc(getCallRef(callId));
  const callData = callSnap.data();
  if (!callData?.offer) throw new Error('Call offer not found');

  if (peerConnection) {
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
    localStream = null;
  }
  remoteStream = null;
  iceCandidateUnsubs.forEach((unsub) => unsub());
  iceCandidateUnsubs = [];

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video,
      audio: true,
    });
  } catch {
    throw new Error('Could not access camera/microphone');
  }

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

  const iceUnsub = subscribeIceCandidates(peerConnection, callId, 'receiver');
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

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection?.connectionState;
    console.log('[Call] Receiver connection state:', state);
    if (state === 'failed') {
      endCall(callId);
    }
  };

  let iceFailedTimer: ReturnType<typeof setTimeout> | null = null;
  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection?.iceConnectionState;
    console.log('[Call] Receiver ICE state:', state);

    if (state === 'failed') {
      if (!iceFailedTimer) {
        iceFailedTimer = setTimeout(() => {
          console.log('[Call] ICE failed for too long, ending call');
          endCall(callId);
        }, 5000);
      }
    } else if (state === 'connected' || state === 'completed') {
      if (iceFailedTimer) {
        clearTimeout(iceFailedTimer);
        iceFailedTimer = null;
      }
    }
  };
}

export async function endCall(callId: string): Promise<void> {
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

  window.dispatchEvent(new CustomEvent('call-ended', { detail: { callId } }));
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

  const settings = videoTrack.getSettings();
  const facingMode = settings.facingMode === 'user' ? 'environment' : 'user';

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode },
    audio: false,
  });

  const newTrack = newStream.getVideoTracks()[0];

  if (peerConnection) {
    const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(newTrack);
  }

  videoTrack.stop();
  localStream.removeTrack(videoTrack);
  localStream.addTrack(newTrack);
  newStream.getAudioTracks().forEach((t) => t.stop());
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
