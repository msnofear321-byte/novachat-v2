/**
 * Normalize a phone number into a comparable digit string.
 *
 * Strips spaces, brackets, hyphens and every other non-digit character, then
 * normalizes common Indian-number spellings so `+91 98765 43210`,
 * `09876543210`, `(91) 98765-43210` and `9876543210` all resolve to the same
 * key. This prevents the same person from appearing as several search results
 * just because their number was formatted differently. Non-Indian numbers are
 * only stripped, never re-prefixed.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  // 10-digit local number -> Indian national key with +91.
  if (digits.length === 10) return `91${digits}`;
  // 11 digits with a leading trunk `0` (e.g. 09876543210).
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

/** True when the trimmed input looks like a (possibly partial) phone search. */
export function isPhoneQuery(value: string): boolean {
  return normalizePhone(value).length >= 6;
}
