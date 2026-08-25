# QRGuard Automated Security Test Execution Report

**Execution Timestamp:** 2026-08-25 11:08:30 UTC  
**Environment:** Node.js v24.19.0, Jest 29+, SQLite (Prisma ORM)  
**Total Test Suites:** 10 Passed / 10 Total  
**Total Tests:** 110 Passed / 110 Total  
**Failures / Errors:** 0  

---

## Detailed Test Results by Category

### 1. SSRF & Network Gateway Protection (`tests/security/ssrf.security.test.ts`)
| Test ID | Threat / Target | Expected Result | Actual Result | Security Control | Status |
|---|---|---|---|---|---|
| `SSRF-01` | `file:///etc/passwd` | Rejected scheme | Blocked: `SSRF_UNSUPPORTED_SCHEME` | URL Validator (Scheme allowlist) | **PASS** |
| `SSRF-02` | `gopher://127.0.0.1:70/` | Rejected scheme | Blocked: `SSRF_UNSUPPORTED_SCHEME` | URL Validator (Scheme allowlist) | **PASS** |
| `SSRF-03` | `http://admin:secret@host` | Rejected embedded credentials | Blocked: `URL_EMBEDDED_CREDENTIALS` | URL Validator | **PASS** |
| `SSRF-04` | `127.0.0.1` (Loopback) | Non-public IP rejected | Blocked: `LOOPBACK` / `isPublic: false` | IP Validator (CIDR 127.0.0.0/8) | **PASS** |
| `SSRF-05` | `10.0.0.1` (RFC1918) | Private IP rejected | Blocked: `PRIVATE` / `isPublic: false` | IP Validator (CIDR 10.0.0.0/8) | **PASS** |
| `SSRF-06` | `172.16.0.1` (RFC1918) | Private IP rejected | Blocked: `PRIVATE` / `isPublic: false` | IP Validator (CIDR 172.16.0.0/12) | **PASS** |
| `SSRF-07` | `192.168.1.1` (RFC1918) | Private IP rejected | Blocked: `PRIVATE` / `isPublic: false` | IP Validator (CIDR 192.168.0.0/16) | **PASS** |
| `SSRF-08` | `169.254.169.254` (Metadata) | Link-local/Metadata rejected | Blocked: `LINK_LOCAL` / `isPublic: false` | IP Validator (CIDR 169.254.0.0/16) | **PASS** |
| `SSRF-09` | `::1` (IPv6 Loopback) | Non-public IPv6 rejected | Blocked: `LOOPBACK` / `isPublic: false` | IP Validator (CIDR ::1/128) | **PASS** |
| `SSRF-10` | `::ffff:127.0.0.1` (Mapped) | Mapped IPv4 loopback rejected | Blocked: `isPublic: false` | IP Validator (Mapped IPv6 extractor) | **PASS** |
| `SSRF-11` | Port 3306 / 5432 / 22 | Dangerous port rejected | Blocked: `SSRF_NETWORK_POLICY_VIOLATION` | Network Policy (Port allowlist) | **PASS** |
| `SSRF-12` | SafeFetch loopback execution | End-to-end block | Blocked: `SSRF_LOOPBACK_BLOCKED` | SafeHttpClient + DNS Pinning | **PASS** |

### 2. Authentication & Password Security (`tests/security/auth.security.test.ts`)
| Test ID | Threat / Target | Expected Result | Actual Result | Security Control | Status |
|---|---|---|---|---|---|
| `AUTH-01` | Argon2id Algorithm | Produces `$argon2id$` hash | Verified `$argon2id$` format | Argon2id KDF | **PASS** |
| `AUTH-02` | Salt Randomness | Hashes differ for same input | Hash 1 != Hash 2 | Argon2id unique 16-byte salt | **PASS** |
| `AUTH-03` | Valid Credentials | Verification succeeds | `verifyPassword() == true` | Argon2id verify | **PASS** |
| `AUTH-04` | Invalid Credentials | Verification fails | `verifyPassword() == false` | Argon2id verify (constant-time) | **PASS** |
| `AUTH-05` | Malformed Hashes | Handled without crash | Graceful `false` return | Safe error catch | **PASS** |

### 3. Authorization & IDOR Defense (`tests/security/idor.security.test.ts`)
| Test ID | Threat / Target | Expected Result | Actual Result | Security Control | Status |
|---|---|---|---|---|---|
| `IDOR-01` | User A accessing User A Analysis | Access Granted | `allowed: true` | `checkAnalysisOwnership()` | **PASS** |
| `IDOR-02` | User B accessing User A Analysis | Access Denied + Log event | `allowed: false`, event logged | `checkAnalysisOwnership()` | **PASS** |
| `IDOR-03` | Access non-existent resource ID | 404 / Analysis not found | `allowed: false` | Ownership check error handling | **PASS** |

### 4. CSRF & Origin Verification (`tests/security/csrf.security.test.ts`)
| Test ID | Threat / Target | Expected Result | Actual Result | Security Control | Status |
|---|---|---|---|---|---|
| `CSRF-01` | Malicious Origin header | HTTP 403 Forbidden | Blocked: `Origin mismatch` | `csrfOriginProtection` middleware | **PASS** |
| `CSRF-02` | Malicious Referer header | HTTP 403 Forbidden | Blocked: `Referer mismatch` | `csrfOriginProtection` middleware | **PASS** |
| `CSRF-03` | Allowed Frontend Origin | HTTP 200 OK | Request permitted | Whitelisted origin validation | **PASS** |
| `CSRF-04` | Safe GET Request | HTTP 200 OK | Read-only requests permitted | Safe method allowlist | **PASS** |

### 5. File Upload Security (`tests/security/upload.security.test.ts`)
| Test ID | Threat / Target | Expected Result | Actual Result | Security Control | Status |
|---|---|---|---|---|---|
| `UPL-01` | Valid PNG file | Allowed | Header matches `0x89504E47` | `validateFileSignature()` | **PASS** |
| `UPL-02` | Valid JPEG file | Allowed | Header matches `0xFFD8FF` | `validateFileSignature()` | **PASS** |
| `UPL-03` | PHP script with `.png` extension | Rejected (Magic byte mismatch) | `valid: false` | `validateFileSignature()` | **PASS** |
| `UPL-04` | Executable extension (`.php`, `.exe`, `.sh`) | Rejected | `valid: false` | `validateFileExtensionAndMime()` | **PASS** |

### 6. AI Security & Prompt Injection (`tests/security/ai.security.test.ts`)
| Test ID | Threat / Target | Expected Result | Actual Result | Security Control | Status |
|---|---|---|---|---|---|
| `AI-01` | Claude API unavailable / no key | Fail-safe return null | Gracefully returned null; zero app crash | AI Fail-safe client pattern | **PASS** |
| `AI-02` | Prompt injection in URL payload | Deterministic decision preserved | Risk level/score unchanged by injected text | Prompt separation & deterministic isolation | **PASS** |

### 7. XSS & SQL Injection Defense (`tests/security/xss_sqli.security.test.ts`)
| Test ID | Threat / Target | Expected Result | Actual Result | Security Control | Status |
|---|---|---|---|---|---|
| `XSS-01` | `<script>alert(1)</script>` in description | Safely stored, not executed | Stored as literal string | Output sanitization & non-HTML render | **PASS** |
| `SQLI-01` | `' OR '1'='1' --` in Auth filter | Parameterized literal string | Returned `null` (No bypass) | Prisma ORM parameterization | **PASS** |
| `SQLI-02` | `UNION SELECT` in URL lookup | Parameterized literal query | Returned `null` (No bypass) | Prisma ORM parameterization | **PASS** |
