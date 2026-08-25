/**
 * QRGuard Centralized Security Configuration
 * All security constants, thresholds, and policies live here.
 * Never scatter security values throughout the codebase.
 */

export const SECURITY_CONFIG = {
  // ─── URL Validation ────────────────────────────────────────────────────────
  ALLOWED_SCHEMES: ['http', 'https'] as const,
  MAX_URL_LENGTH: 2048,
  MAX_HOSTNAME_LENGTH: 253,
  MAX_REDIRECTS: 5,

  // ─── Network Policy ─────────────────────────────────────────────────────────
  REQUEST_TIMEOUT_MS: 10_000,      // 10 seconds total
  CONNECT_TIMEOUT_MS: 5_000,       // 5 seconds to establish connection
  MAX_RESPONSE_SIZE_BYTES: 1_048_576, // 1 MB
  ALLOWED_PORTS: [80, 443] as number[],

  // ─── Private/Reserved IP Ranges (CIDR notation) ─────────────────────────────
  BLOCKED_IPv4_RANGES: [
    '0.0.0.0/8',        // "This" network
    '10.0.0.0/8',       // RFC 1918 private
    '100.64.0.0/10',    // Shared address space (RFC 6598)
    '127.0.0.0/8',      // Loopback
    '169.254.0.0/16',   // Link-local (APIPA)
    '172.16.0.0/12',    // RFC 1918 private
    '192.0.0.0/24',     // IETF Protocol Assignments
    '192.0.2.0/24',     // Documentation (TEST-NET-1)
    '192.168.0.0/16',   // RFC 1918 private
    '198.18.0.0/15',    // Network Interconnect Device Benchmark Testing
    '198.51.100.0/24',  // Documentation (TEST-NET-2)
    '203.0.113.0/24',   // Documentation (TEST-NET-3)
    '224.0.0.0/4',      // Multicast
    '240.0.0.0/4',      // Reserved
    '255.255.255.255/32', // Broadcast
  ],

  BLOCKED_IPv6_RANGES: [
    '::1/128',          // Loopback
    '::/128',           // Unspecified
    'fc00::/7',         // Unique local
    'fe80::/10',        // Link-local
    'ff00::/8',         // Multicast
    '2001:db8::/32',    // Documentation
    '100::/64',         // Discard
  ],

  // Cloud metadata endpoints (always block)
  BLOCKED_HOSTNAMES: [
    'metadata.google.internal',
    '169.254.169.254',  // AWS/GCP/Azure metadata IP
    'metadata.azure.internal',
  ],

  // ─── File Upload ────────────────────────────────────────────────────────────
  ALLOWED_UPLOAD_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'] as const,
  ALLOWED_UPLOAD_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'] as const,
  MAX_UPLOAD_SIZE_BYTES: 5_242_880, // 5 MB
  MAX_IMAGE_DIMENSION: 4096,        // pixels
  MIN_IMAGE_DIMENSION: 10,          // pixels

  // Magic bytes for file signature validation
  FILE_SIGNATURES: {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46, 0x38],
    'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF
    'image/bmp': [0x42, 0x4D],
  } as Record<string, number[]>,

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  RATE_LIMITS: {
    LOGIN: { windowMs: 15 * 60 * 1000, max: 10 },              // 10/15min
    REGISTER: { windowMs: 60 * 60 * 1000, max: 5 },            // 5/hour
    QR_ANALYZE: { windowMs: 60 * 1000, max: 20 },              // 20/min
    URL_ANALYZE: { windowMs: 60 * 1000, max: 30 },             // 30/min
    COMMUNITY_REPORT: { windowMs: 60 * 60 * 1000, max: 20 },   // 20/hour
    ADMIN_API: { windowMs: 60 * 1000, max: 100 },              // 100/min
    SECURITY_LAB: { windowMs: 60 * 1000, max: 10 },            // 10/min
  },

  // ─── Risk Scoring ───────────────────────────────────────────────────────────
  RISK_SCORES: {
    CLEAN_URL: 0,
    INVALID_URL: 10,
    HTTP_NOT_HTTPS: 15,
    SUSPICIOUS_DOMAIN_LENGTH: 10,   // domain > 30 chars
    EXCESSIVE_SUBDOMAINS: 15,       // > 3 subdomains
    PUNYCODE_IDN: 25,
    MISLEADING_BRAND: 35,
    SUSPICIOUS_DOMAIN_CHARS: 20,
    SUSPICIOUS_TLD: 25,
    UNUSUAL_PORT: 15,
    MULTIPLE_REDIRECTS: 20,         // > 2 redirects
    CREDENTIAL_PATH_KEYWORD: 25,    // login, password, verify, secure, account
    COMMUNITY_REPORTS_LOW: 15,      // 1-4 reports
    COMMUNITY_REPORTS_MED: 35,      // 5-14 reports
    COMMUNITY_REPORTS_HIGH: 60,     // 15+ reports
    SUSPICIOUS_REDIRECT: 35,
    REPEATED_ABUSE: 40,
    PRIVATE_IP_RESOLUTION: 70,
    BLOCKED_SSRF_ATTEMPT: 80,
    MAX_SCORE: 100,
  },

  RISK_LEVELS: {
    LOW: { min: 0, max: 20, label: 'LOW' },
    MEDIUM: { min: 21, max: 50, label: 'MEDIUM' },
    HIGH: { min: 51, max: 75, label: 'HIGH' },
    CRITICAL: { min: 76, max: 100, label: 'CRITICAL' },
  },

  // ─── Credential-related path keywords ───────────────────────────────────────
  CREDENTIAL_KEYWORDS: [
    'login', 'signin', 'sign-in', 'logon', 'log-in',
    'password', 'passwd', 'pwd',
    'verify', 'verification', 'validate', 'validation',
    'secure', 'security',
    'account', 'accounts',
    'credential', 'credentials',
    'auth', 'authenticate', 'authentication',
    'bank', 'banking',
    'payment', 'pay', 'checkout', 'upi',
    'wallet', 'card', 'credit', 'debit',
  ],

  // Brand keywords that might indicate impersonation
  BRAND_KEYWORDS: [
    'paypal', 'paytm', 'pay-tm', 'gpay', 'phonepe', 'bhim', 'sbi', 'hdfc', 'icici',
    'tneb', 'bescom', 'mahadiscom', 'amazon', 'google', 'microsoft', 'apple',
    'facebook', 'instagram', 'twitter', 'netflix', 'bank', 'wellsfargo', 'chase',
    'citibank', 'barclays', 'hsbc', 'visa', 'mastercard', 'binance', 'coinbase',
  ],

  // Suspicious Top-Level Domains frequently leveraged in bulk quishing/phishing
  SUSPICIOUS_TLDS: [
    '.xyz', '.top', '.work', '.click', '.loan', '.gq', '.cf', '.tk', '.ml',
    '.ga', '.surf', '.live', '.buzz', '.rest', '.fit', '.pw', '.monster', '.icu',
  ],

  // ─── Session ────────────────────────────────────────────────────────────────
  SESSION: {
    COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    COOKIE_NAME: 'qrguard.sid',
    SAME_SITE: 'strict' as const,
  },

  // ─── Password ───────────────────────────────────────────────────────────────
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
  },

  // ─── Security Event Severity ────────────────────────────────────────────────
  EVENT_SEVERITY: {
    SSRF_LOOPBACK_BLOCKED: 'CRITICAL',
    SSRF_PRIVATE_IP_BLOCKED: 'HIGH',
    SSRF_LINK_LOCAL_BLOCKED: 'HIGH',
    SSRF_UNSUPPORTED_SCHEME: 'MEDIUM',
    SSRF_REDIRECT_BLOCKED: 'HIGH',
    SSRF_DNS_VALIDATION_FAILURE: 'HIGH',
    SSRF_TIMEOUT: 'LOW',
    SSRF_NETWORK_POLICY_VIOLATION: 'HIGH',
    IDOR_ATTEMPT: 'HIGH',
    RATE_LIMIT_EXCEEDED: 'MEDIUM',
    AUTH_FAILURE: 'MEDIUM',
    INVALID_UPLOAD: 'LOW',
    XSS_ATTEMPT: 'HIGH',
    CSRF_ATTEMPT: 'HIGH',
  } as Record<string, string>,

  // ─── Claude AI ──────────────────────────────────────────────────────────────
  AI: {
    MAX_INDICATORS_TO_SEND: 10,
    MAX_URL_SNIPPET_LENGTH: 100,
    MODEL: 'claude-3-5-haiku-20241022',
    MAX_TOKENS: 800,
    TIMEOUT_MS: 15_000,
  },

  // ─── Security Test Fixtures (safe, synthetic targets) ───────────────────────
  TEST_FIXTURES: {
    LOOPBACK: '127.0.0.1',
    PRIVATE_10: '10.0.0.1',
    PRIVATE_172: '172.16.0.1',
    PRIVATE_192: '192.168.1.1',
    LINK_LOCAL: '169.254.1.1',
    METADATA: '169.254.169.254',
    UNSUPPORTED_SCHEME: 'file:///etc/passwd',
    REDIRECT_TO_PRIVATE: 'TEST_REDIRECT_TO_PRIVATE',
  },
} as const;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SecurityEventType =
  | 'SSRF_PRIVATE_IP_BLOCKED'
  | 'SSRF_LOOPBACK_BLOCKED'
  | 'SSRF_LINK_LOCAL_BLOCKED'
  | 'SSRF_UNSUPPORTED_SCHEME'
  | 'SSRF_REDIRECT_BLOCKED'
  | 'SSRF_DNS_VALIDATION_FAILURE'
  | 'SSRF_TIMEOUT'
  | 'SSRF_NETWORK_POLICY_VIOLATION'
  | 'IDOR_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AUTH_FAILURE'
  | 'INVALID_UPLOAD'
  | 'XSS_ATTEMPT'
  | 'CSRF_ATTEMPT'
  | 'AUTH_SUCCESS'
  | 'ADMIN_ACTION';

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 20) return 'LOW';
  if (score <= 50) return 'MEDIUM';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}
