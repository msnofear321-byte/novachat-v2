export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function toMillis(
  value: number | { seconds: number } | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.seconds * 1000;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = now.getDate() - date.getDate() === 1 &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  if (diff < dayMs * 6) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function formatLastSeen(timestamp: number): string {
  if (!timestamp) return 'Last seen recently';
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins} minute${mins === 1 ? '' : 's'} ago`;
  if (date.toDateString() === today.toDateString()) {
    return `Last seen today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (hours < 24) return `Last seen ${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (date.toDateString() === yesterday.toDateString()) return 'Last seen yesterday';
  return `Last seen on ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
