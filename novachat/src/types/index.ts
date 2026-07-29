export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  status: 'online' | 'offline';
  lastSeen: number;
  createdAt: number;
  about?: string;
  phone?: string;
  fcmToken?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: number;
  editedAt?: number;
  edited?: boolean;
  read: boolean;
  delivered: boolean;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
  mediaURL?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    type: string;
  };
  starred: boolean;
  deleted: boolean;
  deletedBy?: string[];
  deletedForEveryone?: boolean;
  forwarded: boolean;
  duration?: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: number;
  lastMessageSenderId: string;
  unreadCount: number;
  pinned: boolean;
  archived?: boolean;
  muted?: boolean;
  blocked?: boolean;
  createdAt: number;
}

export interface LiveLocation {
  conversationId: string;
  userId: string;
  latitude: number;
  longitude: number;
  durationLabel: '15 min' | '1 hr' | '8 hr';
  expiresAt: number;
  updatedAt: number;
}

export interface MusicStatus {
  userId: string;
  service: 'Spotify' | 'YouTube' | 'Apple Music' | 'Other';
  trackTitle: string;
  artist?: string;
  link: string;
  statusText?: string;
  updatedAt: number;
}

export interface TypingStatus {
  active: boolean;
  timestamp: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'checklist' | 'voice' | 'image' | 'audio';
  mediaUrl?: string;
  images: string[];
  checklist: { id: string; text: string; done: boolean }[];
  pinned: boolean;
  favorite: boolean;
  color?: string;
  createdAt: number;
  updatedAt: number;
}
