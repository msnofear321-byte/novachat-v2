import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { LiveLocation } from '@/types';

export async function saveLiveLocation(
  conversationId: string,
  latitude: number,
  longitude: number,
  durationLabel: '15 min' | '1 hr' | '8 hr',
): Promise<LiveLocation> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const expiresAt = Date.now() + (durationLabel === '15 min' ? 15 * 60 * 1000 : durationLabel === '1 hr' ? 60 * 60 * 1000 : 8 * 60 * 60 * 1000);
  const location: LiveLocation = {
    conversationId,
    userId: user.uid,
    latitude,
    longitude,
    durationLabel,
    expiresAt,
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, 'liveLocations', conversationId), location);
  return location;
}
