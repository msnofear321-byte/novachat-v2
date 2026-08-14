/**
 * Instagram handle helpers.
 *
 * A handle is stored as a bare username (no leading "@") and is only ever
 * turned into a URL after sanitization/validation, so arbitrary schemes
 * (javascript:, data:, ...) can never be produced from user input.
 */

const INSTAGRAM_USERNAME_RE = /^[A-Za-z0-9._]{1,30}$/;

/** Trim whitespace and strip a single leading "@". */
export function sanitizeInstagram(value: string): string {
  return value.trim().replace(/^@+/, '').trim();
}

/** True when the value is a safe, displayable Instagram username. */
export function isValidInstagramHandle(handle: string): boolean {
  const clean = sanitizeInstagram(handle);
  if (!clean) return false;
  return INSTAGRAM_USERNAME_RE.test(clean);
}

/**
 * Build a safe profile URL from a handle, or null when the handle is empty
 * or invalid. The resulting URL always points to instagram.com and never
 * embeds user-controlled scheme/path parts (only safe chars are allowed).
 */
export function instagramUrl(handle: string): string | null {
  const clean = sanitizeInstagram(handle);
  if (!isValidInstagramHandle(clean)) return null;
  return `https://instagram.com/${clean}`;
}
