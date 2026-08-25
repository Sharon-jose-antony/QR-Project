# QRGuard — Architecture & Threat Model

## System Overview

QRGuard acts as a zero-trust **Community Digital Safety Gateway** positioned between users and untrusted digital destinations (URLs and decoded QR code payloads).

```
+-------------------------------------------------------------------------------+
|                                 USER CLIENT                                   |
|   [ Scan QR Code ]           [ Paste / Check Link ]        [ Share Target ]   |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                           QRGUARD SECURITY GATEWAY                            |
|                                                                               |
|  1. Input Sanitization & Scheme Allowlist (http / https)                     |
|  2. WHATWG Normalization & Credential Stripping                               |
|  3. Dual-Stack DNS Resolution (A / AAAA Records)                              |
|  4. CIDR IP Classification (RFC1918, RFC6598, Loopback, Link-Local, Cloud)    |
|  5. Network Port Policy (80 / 443 Only)                                       |
|  6. Safe HTTP Client with DNS Pinning (Direct Socket IP Binding)              |
|  7. Hop-by-Hop Manual Redirect Validation (Max 5 Hops, Re-resolving DNS)      |
|  8. Content-Length Bounds (1MB Limit) & Timeout Bounds (10,000ms)             |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       DETERMINISTIC RISK ENGINE & AI                          |
|                                                                               |
|  • Mathematical Risk Score (0–100)                                            |
|  • Threat Classifications:                                                    |
|      0–29:  🟢 LOW RISK (Safe to Proceed)                                     |
|     30–59:  🟡 SUSPICIOUS (Warning & Indicators)                              |
|     60–100: 🔴 HIGH RISK / BLOCKED (Private IP, Phishing, Dangerous Scheme)   |
|  • Claude AI Plain-Language Explanations (Isolated from decision-making)      |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                      EXPLICIT USER DECISION & CONSENT                         |
|                                                                               |
|  • Safe Links:       [ Open Website ] (Explicit Click, No Auto-Redirect)      |
|  • Suspicious Links: [ Go Back ] or [ Open Anyway ] + Confirmation Modal      |
|  • High-Risk Links:  [ Go Back ] or [ Report Threat ]                         |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                        COMMUNITY INTELLIGENCE LOOP                            |
|                                                                               |
|  • Privacy-Scrubbed Telemetry Aggregation (Zero PII / Session Tokens)         |
|  • Multi-Contributor Flagging (Phishing, Quishing, Fake Login, Scam)          |
|  • Real-Time Domain Reputation Alerts for All Subsequent Scanners             |
+-------------------------------------------------------------------------------+
```

---

## Threat Vectors Mitigated

| Threat Vector | Description | QRGuard Defense Mechanism |
|---|---|---|
| **Quishing (QR Phishing)** | Physical or digital QR codes leading to credential harvesters or fake UPI payment forms. | Magic-byte image verification, domain brand heuristic matching, community threat feed. |
| **Server-Side Request Forgery (SSRF)** | Attacker inputs `127.0.0.1`, `169.254.169.254` (cloud metadata), or private VPC IPs (`10.0.0.0/8`). | Dual-stack CIDR classification (`ip-address` library) blocking all non-public IPs before connection. |
| **DNS Rebinding / TOCTOU SSRF** | Domain resolves to public IP during pre-check, but rebinds to `127.0.0.1` during socket connection. | **DNS Pinning** via custom HTTP/HTTPS agent lookup binding socket directly to pre-validated IP. |
| **Public-to-Private Redirect Pivot** | Attacker uses a public redirector (`https://attacker.com/redir?to=http://192.168.1.1`). | Manual redirect loop (max 5 hops) enforcing DNS/CIDR validation on every individual hop. |
| **Prompt Injection in AI Explanations** | Webpage contains text designed to override LLM system prompts (`"IGNORE ALL PREVIOUS INSTRUCTIONS..."`). | Deterministic Risk Engine makes 100% of security decisions. LLM is strictly used for output explanation with untrusted payload framing. |
| **Cross-Site Request Forgery (CSRF)** | Attacker triggers state-changing actions via cross-site requests. | `SameSite=Strict` session cookies + Origin / Referer validation middleware (`csrfOriginProtection`). |
| **Insecure Direct Object Reference (IDOR)** | User attempts to access private scan histories of other users. | Server-side ownership verification (`checkAnalysisOwnership()`) returning 404 and logging `IDOR_ATTEMPT`. |
