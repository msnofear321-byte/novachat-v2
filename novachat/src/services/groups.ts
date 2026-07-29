import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
  query, where, orderBy, onSnapshot, arrayUnion, arrayRemove,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: number;
  lastMessage: string;
  lastMessageTime: number;
}

export async function createGroup(
  name: string,
  memberIds: string[],
  description: string = '',
  icon: string = '',
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const groupId = `group_${user.uid}_${Date.now()}`;
  const allMembers = [...new Set([user.uid, ...memberIds])];

  await setDoc(doc(db, 'groups', groupId), {
    name,
    description,
    icon,
    members: allMembers,
    admins: [user.uid],
    createdBy: user.uid,
    createdAt: Date.now(),
    lastMessage: '',
    lastMessageTime: Date.now(),
  });

  return groupId;
}

export function subscribeToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId),
  );

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Group[];
    callback(groups);
  });
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
}

export async function addMembersToGroup(
  groupId: string,
  memberIds: string[],
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayUnion(...memberIds),
  });
}

export async function removeMemberFromGroup(
  groupId: string,
  memberId: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  if (!groupSnap.exists()) return;
  const group = groupSnap.data() as Group;

  if (!group.admins.includes(user.uid) && user.uid !== memberId) {
    throw new Error('Only admins can remove members');
  }

  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayRemove(memberId),
    admins: arrayRemove(memberId),
  });
}

export async function promoteToAdmin(
  groupId: string,
  memberId: string,
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    admins: arrayUnion(memberId),
  });
}

export async function demoteFromAdmin(
  groupId: string,
  memberId: string,
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    admins: arrayRemove(memberId),
  });
}

export async function updateGroup(
  groupId: string,
  data: Partial<Pick<Group, 'name' | 'description' | 'icon'>>,
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), data);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const msgsSnap = await getDocs(collection(db, 'groupMessages', groupId, 'messages'));
  const batch = (await import('firebase/firestore')).writeBatch(db);
  msgsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'groups', groupId));
  await batch.commit();
}

export async function sendGroupMessage(
  groupId: string,
  text: string,
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif' = 'text',
  mediaURL?: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const msgData: Record<string, unknown> = {
    groupId,
    senderId: user.uid,
    senderName: user.displayName || 'Unknown',
    text,
    createdAt: Date.now(),
    read: false,
    type,
    starred: false,
    deleted: false,
    forwarded: false,
  };
  if (mediaURL) msgData.mediaURL = mediaURL;

  const msgRef = await import('firebase/firestore').then((m) =>
    m.addDoc(collection(db, 'groupMessages', groupId, 'messages'), msgData)
  );

  await updateDoc(doc(db, 'groups', groupId), {
    lastMessage: type === 'text' ? text : `📎 ${type}`,
    lastMessageTime: Date.now(),
  });

  return msgRef.id;
}

export function subscribeToGroupMessages(
  groupId: string,
  callback: (messages: Record<string, unknown>[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'groupMessages', groupId, 'messages'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(messages);
  });
}
