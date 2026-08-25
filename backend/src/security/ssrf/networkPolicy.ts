/**
 * QRGuard Network Policy
 * Defines the outbound network policy for the SafeFetch gateway.
 * Centralizes all allowed/blocked network decisions.
 */

import { SECURITY_CONFIG } from '../../config/security';

export interface NetworkPolicyResult {
  allowed: boolean;
  reason?: string;
  violationType?: string;
}

/**
 * Checks if a port is allowed by network policy.
 */
export function checkPortPolicy(port: number | null | undefined, scheme: string): NetworkPolicyResult {
  if (!port) {
    // No explicit port — defaults apply (80 for http, 443 for https)
    return { allowed: true };
  }

  // Standard ports always allowed
  if (port === 80 || port === 443) {
    return { allowed: true };
  }

  // Well-known dangerous ports
  const DANGEROUS_PORTS = [
    21,   // FTP
    22,   // SSH
    23,   // Telnet
    25,   // SMTP
    3306, // MySQL
    5432, // PostgreSQL
    6379, // Redis
    27017, // MongoDB
    8080, 8443, 8888, // Common internal ports
  ];

  if (DANGEROUS_PORTS.includes(port)) {
    return {
      allowed: false,
      reason: `Port ${port} is not allowed by network policy`,
      violationType: 'SSRF_NETWORK_POLICY_VIOLATION',
    };
  }

  // Allow other ports but flag as unusual (handled in risk engine as indicator)
  return { allowed: true, reason: `Unusual port ${port} — flagged as risk indicator` };
}

/**
 * Validates scheme against allowlist.
 */
export function checkSchemePolicy(scheme: string): NetworkPolicyResult {
  const normalized = scheme.toLowerCase().replace(':', '');
  if ((SECURITY_CONFIG.ALLOWED_SCHEMES as readonly string[]).includes(normalized)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Scheme '${normalized}' is not permitted`,
    violationType: 'SSRF_UNSUPPORTED_SCHEME',
  };
}
