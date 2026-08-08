import { createConversation } from '@/services/firestore';

/**
 * Compute the deterministic conversation id for a 1:1 chat and make sure the
 * conversation document exists (idempotent — safe to call repeatedly, never
 * creates duplicates). Resolves with the conversation id so callers can
 * navigate immediately after creation.
 */
export async function openConversationWithUser(
  _currentUid: string,
  otherUid: string,
): Promise<string> {
  return createConversation(otherUid);
}

/**
 * Resolve the *other* participant's uid for a 1:1 conversation.
 *
 * Firebase auth uids are base64url strings (email/password: 28 chars, and they
 * contain `-`/`_`) or 21-digit numbers (Google). Splitting the conversation id
 * on `_` therefore produces wrong fragments, which is why the chat header used
 * to show "Unknown". The participants array in the conversation doc is the
 * source of truth; the id is only used as a fallback before that doc loads.
 */
export function getConversationOtherId(
  conversationId: string,
  myUid: string | undefined,
  conversation?: { participants?: string[] } | undefined,
): string {
  const fromParts = conversation?.participants?.find((p) => p && p !== myUid);
  if (fromParts) return fromParts;

  if (!myUid) return '';

  // Fallback for the canonical (new) id scheme: `|` never appears in a uid.
  if (conversationId.includes('|')) {
    const sep = conversationId.indexOf('|');
    if (sep > 0) {
      const a = conversationId.slice(0, sep);
      const b = conversationId.slice(sep + 1);
      if (a === myUid) return b;
      if (b === myUid) return a;
    }
  }

  // Legacy `_`-scheme ids cannot be parsed reliably, and guessing wrong could
  // surface another user's profile, so we wait for the conversation doc instead.
  return '';
}
