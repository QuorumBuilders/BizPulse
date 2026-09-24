/**
 * BizPulse — Shared repository utilities
 *
 * UUID generation and timestamp helpers used by all repositories.
 */

/**
 * Generate a UUID v4 for use as client_id.
 * Uses the Web Crypto API (available in browsers and Node 18+).
 */
export function generateClientId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Return the current time as an ISO 8601 string.
 * Used to set updated_at on every write.
 */
export function nowISO(): string {
  return new Date().toISOString();
}
