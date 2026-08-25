# QRGuard — Comprehensive Backend Security Audit Report

**Date:** 2026-08-25  
**Auditor:** Automated & Architectural Security Review (Claude Sonnet / Google Antigravity)  
**Target:** QRGuard Core Backend & Threat Intelligence Service  
**Architecture:** Node.js (TypeScript), Express.js, Prisma ORM (SQLite / PostgreSQL compatible), Argon2id, Axios, Winston, Helmet, express-session.

---

## 1. Executive Summary

QRGuard is designed as a secure, crowd-sourced QR Code & URL threat intelligence platform. Its fundamental security mission is:
> *Allow users to submit untrusted, potentially malicious URLs and QR codes for security analysis without exposing the server to Server-Side Request Forgery (SSRF), Remote Code Execution (RCE), Insecure Direct Object References (IDOR), or Cross-Site Scripting (XSS).*

This audit evaluated all layers of the application against standard security benchmarks (OWASP Top 10, CWE/SANS Top 25, SSRF Prevention Best Practices).

---

## 2. Architecture & Tech Stack Evaluation

| Component | Framework / Library | Security Role | Status |
|---|---|---|---|
| **Web Server** | Express 4.19+ (TypeScript) | Core API routing & middleware pipeline | IMPLEMENTED |
| **Database & ORM** | Prisma 5.22.0 | Parameterized SQL query abstraction & schema management | IMPLEMENTED |
| **Authentication** | `argon2` + `express-session` | Argon2id hashing + HttpOnly / SameSite=Strict cookies | IMPLEMENTED |
| **SSRF Defense** | Custom multi-layer gateway | Scheme allowlist, IP/CIDR classification, DNS verification, manual redirect inspection | IMPLEMENTED |
| **HTTP Client** | `axios` (configured strictly) | Disables auto-redirects, bounds memory/timeouts, no creds | IMPLEMENTED |
| **Image / QR Decoder** | `multer` + `jimp` + `jsQR` | Safe UUID disk buffering, magic bytes verification, dimension constraints | IMPLEMENTED |
| **Security Headers** | `helmet` | CSP, HSTS, X-Content-Type-Options, Permissions-Policy, X-Frame-Options | IMPLEMENTED |
| **AI Integration** | `@anthropic-ai/sdk` (Claude 3.5 Haiku) | Explains deterministic findings; zero decision-making power | IMPLEMENTED |

---

## 3. Security Findings & Classification

### Critical Findings
* **None identified in current state.** (Core SSRF controls, parameterized queries, and Argon2id are present).

### High Findings
* **FINDING-01 [DNS Rebinding / TOCTOU Window]:** `safeHttpClient` validates DNS records via `validateHostnameDNS()` and then makes an HTTP request via Axios. In high-frequency environments, an attacker using a rapidly alternating DNS record (TTL=0) could pass validation and rebind to `127.0.0.1` before Axios connects.  
  * **Remediation:** Implement DNS Pinning / Custom HTTP Agent lookup to bind socket connections directly to the validated IP address.
* **FINDING-02 [CSRF Origin Defense Enhancement]:** State-changing endpoints rely primarily on `SameSite=Strict` cookies. While effective in modern browsers, adding explicit `Origin` / `Referer` validation provides defense-in-depth against cross-site requests.
  * **Remediation:** Introduce centralized Origin-checking middleware.

### Medium Findings
* **FINDING-03 [IP Representation Formats]:** URLs containing non-standard IP formats (e.g., dword `http://2130706433`, octal `http://0177.0.0.1`, or IPv4-mapped IPv6 `http://[::ffff:127.0.0.1]`) must be normalized before classification.
  * **Remediation:** Harden `urlValidator.ts` and `ipValidator.ts` to expand classification coverage across mapped representations.
* **FINDING-04 [File Upload Validation Decoupling]:** Multer upload validation was embedded directly inside `qr.ts`.
  * **Remediation:** Consolidate file upload security (magic bytes, dimensions, extensions) into a dedicated module (`backend/src/security/upload/fileValidator.ts`).

### Low Findings
* **FINDING-05 [Security Test Suite Automation]:** Security test cases were present in the admin security lab route, but automated Jest security test files were missing under `backend/tests/security/`.
  * **Remediation:** Implement automated integration tests covering all threat categories.

---

## 4. Remediation Matrix & Implementation Status

| Category | Finding ID | Control Description | Remediation Status |
|---|---|---|---|
| **SSRF** | FINDING-01 | DNS Pinning & TOCTOU socket binding | IMPLEMENTED |
| **SSRF** | FINDING-03 | Octal/Hex/IPv4-mapped IPv6 handling | IMPLEMENTED |
| **CSRF** | FINDING-02 | Origin / Referer validation middleware | IMPLEMENTED |
| **Upload** | FINDING-04 | Dedicated File Signature & Dimension validator | IMPLEMENTED |
| **Testing** | FINDING-05 | Full automated Jest security test suite | IMPLEMENTED |

---

## 5. SSRF Defense Layer Walkthrough

```
[ UNTRUSTED USER INPUT ]
           │
           ▼
[ 1. URL Parser & Normalizer ] (WHATWG URL, Scheme allowlist, strip credentials)
           │
           ▼
[ 2. Scheme & Port Policy ] (Strict http/https, blocked high-risk ports)
           │
           ▼
[ 3. DNS Pre-Resolution & IP Validator ] (A/AAAA resolution, RFC1918, RFC6598, Link-Local, Cloud Metadata)
           │
           ▼
[ 4. Safe Fetch with DNS Pinning ] (Direct IP socket connection with Host header)
           │
           ▼
[ 5. Manual Redirect Inspection ] (Repeat layers 1-4 for each redirect, max 5 hops)
           │
           ▼
[ 6. Content Limits & Metadata Extraction ] (Max 1MB response, timeout 10s, HTML sanitization)
```
