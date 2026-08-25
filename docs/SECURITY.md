# QRGuard — Security Controls & Policies

## 1. Network & SSRF Defenses

### Scheme Policy
Only standard web schemes (`http://` and `https://`) are permitted. All others are blocked before network evaluation:
- Blocked: `file://`, `gopher://`, `ftp://`, `tftp://`, `ldap://`, `dict://`, `ssh://`, `data:`, `javascript:`, `php://`.

### IP Classification & CIDR Boundaries
All IP literals and DNS-resolved addresses are validated against the following blocked CIDRs using the `ip-address` library:
- **IPv4:**
  - `0.0.0.0/8` (Current network)
  - `10.0.0.0/8` (RFC 1918 Private)
  - `100.64.0.0/10` (Carrier-grade NAT)
  - `127.0.0.0/8` (Loopback)
  - `169.254.0.0/16` (Link-local & AWS/GCP/Azure Metadata `169.254.169.254`)
  - `172.16.0.0/12` (RFC 1918 Private)
  - `192.0.0.0/24` (IETF Protocol assignments)
  - `192.0.2.0/24` (TEST-NET-1)
  - `192.168.0.0/16` (RFC 1918 Private)
  - `198.51.100.0/24` (TEST-NET-2)
  - `203.0.113.0/24` (TEST-NET-3)
  - `224.0.0.0/4` (Multicast)
  - `240.0.0.0/4` (Reserved)
- **IPv6:**
  - `::1/128` (Loopback)
  - `::/128` (Unspecified)
  - `fc00::/7` (Unique Local)
  - `fe80::/10` (Link-Local)
  - `ff00::/8` (Multicast)
- **IPv4-Mapped & NAT64:**
  - Unwrapped dynamically (`::ffff:x.x.x.x` and `64:ff9b::x.x.x.x`) to evaluate underlying IPv4 against CIDR ranges.

### DNS Pinning
To eliminate Time-Of-Check to Time-Of-Use (TOCTOU) DNS rebinding vulnerabilities, the HTTP client binds its TCP socket directly to the IP address validated during DNS resolution:
```typescript
const customLookup = (_hostname: string, options: any, callback: any) => {
  const family = isIpv6 ? 6 : 4;
  if (options && options.all) {
    callback(null, [{ address: validatedIp, family }]);
  } else {
    callback(null, validatedIp, family);
  }
};
const httpAgent = new http.Agent({ lookup: customLookup });
const httpsAgent = new https.Agent({ lookup: customLookup, servername: hostname });
```

---

## 2. Authentication & Authorization Controls

- **Password Hashing:** Argon2id (`$argon2id$v=19$m=65536,t=3,p=4`) with cryptographically secure 16-byte random salt.
- **Timing Attack Mitigation:** Constant-time dummy verification on non-existent usernames during login attempts.
- **Session Security:** `express-session` configured with `HttpOnly`, `SameSite=Strict`, and 24-hour expiration.
- **IDOR / BOLA Prevention:** `checkAnalysisOwnership(analysisId, userId)` strictly validates resource ownership server-side, returning generic `404 Not Found` upon mismatch to prevent ID enumeration.

---

## 3. Web & Application Security

- **Cross-Site Request Forgery (CSRF):** `csrfOriginProtection` middleware validates incoming `Origin` and `Referer` headers on all state-changing HTTP requests (`POST`, `PUT`, `DELETE`).
- **File Upload Protection:** Magic-byte validation (`validateFileSignature`), strict MIME checks, and Jimp image dimension enforcement (10px to 4096px). Uploaded files are assigned random UUID filenames and unlinked immediately after processing.
- **Cross-Site Scripting (XSS):** React zero-raw-HTML rendering model, sanitized `<title>` tag extraction, and Helmet Content Security Policy (CSP).
- **SQL Injection:** 100% Prisma ORM parameterized queries; zero raw SQL queries.
- **Rate Limiting:** Express-rate-limit configured on `/api/auth/*` (10 req/15min), `/api/url/analyze` (30 req/min), `/api/qr/analyze` (20 req/min), and `/api/reports` (10 req/min).

---

## 4. AI Security & Fail-Safe Architecture

- **Decision Isolation:** Claude AI is never permitted to determine risk scores or bypass security policies. The deterministic Risk Engine makes all risk assessments.
- **Prompt Injection Defense:** Webpage contents and URLs are provided as untrusted payload fields in structured JSON.
- **Offline Fail-Safe:** If Claude API is unavailable or unconfigured, the platform continues to operate without degradation.
