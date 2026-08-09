/**
 * Resolve a user's display identity, walking the real identity fields in
 * priority order: display name, username, phone number, then the email prefix.
 *
 * NovaChat never labels a user "Unknown" when any identity data exists, and
 * never shows a blank name for the genuinely data-less case — the `fallback`
 * defaults to the app-standard "User" placeholder (callers may override it,
 * e.g. with "Group" or "Member" where a more specific label fits).
 */
export function getDisplayName(
  user: { displayName?: string | null; username?: string | null; phone?: string | null; email?: string | null } | null | undefined,
  fallback = 'User',
): string {
  if (!user) return fallback;

  const name = user.displayName?.trim();
  if (name) return name;

  const username = user.username?.trim();
  if (username) return username;

  const phone = user.phone?.trim();
  if (phone) return phone;

  const email = user.email?.trim();
  if (email) {
    const prefix = email.split('@')[0].trim();
    if (prefix) return prefix;
  }

  return fallback;
}
