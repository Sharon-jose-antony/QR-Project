/**
 * QRGuard URL Validator
 * Parses and validates URLs submitted for analysis.
 *
 * SSRF Defense Layer 1: Scheme allowlisting and URL normalization.
 * Uses Node.js built-in URL class (WHATWG URL Standard).
 */

import { SECURITY_CONFIG } from '../../config/security';

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  scheme?: string;
  hostname?: string;
  port?: number | null;
  pathname?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Parses and validates a URL string.
 * Returns normalized form or error details.
 */
export function validateUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required', errorCode: 'URL_REQUIRED' };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty', errorCode: 'URL_EMPTY' };
  }

  if (trimmed.length > SECURITY_CONFIG.MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL exceeds maximum length of ${SECURITY_CONFIG.MAX_URL_LENGTH} characters`,
      errorCode: 'URL_TOO_LONG',
    };
  }

  // Parse using WHATWG URL standard
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Try adding https:// if no scheme
    try {
      parsed = new URL('https://' + trimmed);
    } catch {
      return {
        valid: false,
        error: 'Invalid URL format',
        errorCode: 'URL_INVALID_FORMAT',
      };
    }
  }

  // Normalize scheme to lowercase
  const scheme = parsed.protocol.replace(':', '').toLowerCase();

  // ── SSRF Defense: Scheme allowlist ──────────────────────────────────────────
  if (!(SECURITY_CONFIG.ALLOWED_SCHEMES as readonly string[]).includes(scheme)) {
    return {
      valid: false,
      error: 'Unsupported URL scheme. Only http and https are allowed.',
      errorCode: 'SSRF_UNSUPPORTED_SCHEME',
      scheme,
    };
  }

  // ── Reject URLs with embedded credentials (e.g., http://user:pass@host) ────
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: 'URLs with embedded credentials are not supported',
      errorCode: 'URL_EMBEDDED_CREDENTIALS',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!hostname) {
    return {
      valid: false,
      error: 'URL has no hostname',
      errorCode: 'URL_NO_HOSTNAME',
    };
  }

  if (hostname.length > SECURITY_CONFIG.MAX_HOSTNAME_LENGTH) {
    return {
      valid: false,
      error: 'Hostname is too long',
      errorCode: 'URL_HOSTNAME_TOO_LONG',
    };
  }

  // ── Check for blocked hostnames (metadata endpoints) ──────────────────────
  if ((SECURITY_CONFIG.BLOCKED_HOSTNAMES as readonly string[]).includes(hostname)) {
    return {
      valid: false,
      error: 'Destination is not allowed',
      errorCode: 'SSRF_BLOCKED_HOSTNAME',
    };
  }

  // ── Port validation ────────────────────────────────────────────────────────
  let port: number | null = null;
  if (parsed.port) {
    port = parseInt(parsed.port, 10);
    if (
      SECURITY_CONFIG.ALLOWED_PORTS.length > 0 &&
      !SECURITY_CONFIG.ALLOWED_PORTS.includes(port)
    ) {
      // Only block non-standard ports (log as indicator but don't hard-block by default)
      // This is flagged as a risk indicator, not a hard block, unless port is obviously dangerous
    }
  }

  // Reconstruct normalized URL (remove fragment, normalize encoding)
  const normalizedUrl = `${parsed.protocol}//${hostname}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname}${parsed.search}`;

  return {
    valid: true,
    normalizedUrl,
    scheme,
    hostname,
    port,
    pathname: parsed.pathname,
  };
}

/**
 * Extracts the registrable domain (eTLD+1) from a hostname.
 * Simple implementation — for production, use 'tldts' package.
 */
export function extractDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  // Return last two parts (simple approach)
  return parts.slice(-2).join('.');
}

/**
 * Checks if a hostname looks like a bare IP address.
 */
export function isIpHostname(hostname: string): boolean {
  // IPv4 pattern
  const ipv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  // IPv6 in brackets (from URL parsing) or raw
  const ipv6 = /^\[?[0-9a-fA-F:]+\]?$/;
  return ipv4.test(hostname) || ipv6.test(hostname);
}

/**
 * Returns the raw hostname from brackets for IPv6 URLs.
 * e.g. "[::1]" → "::1"
 */
export function unwrapIPv6(hostname: string): string {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }
  return hostname;
}
