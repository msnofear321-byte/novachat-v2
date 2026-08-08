export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  /**
   * Real-time presence. `true` only while the app is open, visible and online
   * (maintained by the heartbeat). A reader must treat the user as offline
   * when `online !== true` or when `lastActive` is stale (see isOnlineNow).
   */
  online?: boolean;
  /** Server timestamp (or legacy numeric epoch) of the last known sighting. */
  lastSeen?: number | { seconds: number; nanoseconds?: number };
  /** Server timestamp refreshed every 20s by the presence heartbeat. */
  lastActive?: number | { seconds: number; nanoseconds?: number };
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
  pending?: boolean;
  /** Map of reaction emoji -> array of user ids that reacted. */
  reactions?: Record<string, string[]>;
  /** Message-level pin (starred is a lighter "star"). */
  pinned?: boolean;
}

export interface Conversation {
  id: string;
  type?: 'direct' | 'group';
  name?: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: number;
  lastMessageSenderId: string;
  unreadCount: number;
  /** Per-user unread counts keyed by uid. Preferred over unreadCount. */
  unreadByUser?: Record<string, number>;
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
