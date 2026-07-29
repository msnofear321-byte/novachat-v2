import { useEffect, useCallback, useRef, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from './firebase';
import { setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

let messaging: ReturnType<typeof getMessaging> | null = null;
try {
  messaging = getMessaging(app);
} catch {
  // Firebase Messaging not supported in this environment
}

export async function requestNotificationPermission(
  userId?: string,
): Promise<boolean> {
  if (!messaging) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || '',
    });

    if (token && userId) {
      await setDoc(doc(db, 'users', userId), { fcmToken: token }, { merge: true });
    }

    return true;
  } catch {
    return false;
  }
}

export function playNotificationSound() {
  try {
    const audio = new Audio(
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jk42Hf3R5hZSPg357f4yWl5GFf3x/jZiZk4aAfYCNmZqTh4B9gI2ampOHgX2AjZqak4eBfYCNmpqTh4F9gI2ampOHgX2AjZqak4eBfYCNmpqTh4F9gA==',
    );
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {
    // silent
  }
}

export function showBrowserNotification(
  title: string,
  body: string,
  icon?: string,
) {
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'novachat-message',
    });
  } catch {
    // Service worker not available
  }
}

export function useNotifications(userId?: string) {
  const hasRequested = useRef(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  const requestPermission = useCallback(async () => {
    if (hasRequested.current) return;
    hasRequested.current = true;
    const result = await requestNotificationPermission(userId);
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
    return result;
  }, [userId]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => requestPermission(), 5000);
      return () => clearTimeout(timer);
    }
  }, [requestPermission]);

  return { permission, requestPermission };
}
