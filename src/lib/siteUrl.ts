/**
 * Canonical, user-facing site URL.
 * Auth emails and OAuth callbacks should point at a clean branded domain
 * instead of the long random preview hostname.
 */
export const CANONICAL_SITE_URL = 'https://bulb-ai.lovable.app';

export function getSiteUrl(): string {
  if (typeof window === 'undefined') return CANONICAL_SITE_URL;
  const { origin, hostname } = window.location;

  // Local development keeps the local origin so sessions land back here.
  if (hostname === 'localhost' || hostname === '127.0.0.1') return origin;

  // Long sandbox/preview hostnames look sketchy in emails — use the branded domain.
  if (hostname.includes('id-preview--') || hostname.includes('sandbox')) {
    return CANONICAL_SITE_URL;
  }

  return origin;
}

export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}
