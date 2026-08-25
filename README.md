# QRGuard — Community Digital Safety Gateway

> **"Scan it. Check it. Then open it."**

[![Live App on Vercel](https://img.shields.io/badge/Vercel-qr--project1--gamma.vercel.app-blue?style=flat&logo=vercel)](https://qr-project1-gamma.vercel.app/)
[![Live App on GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-green?style=flat&logo=github)](https://sharon-jose-antony.github.io/QR-Project/)
[![Live Spring Boot Backend on Render](https://img.shields.io/badge/Render-Spring%20Boot%203-46E3B7?style=flat&logo=render)](https://qr-project-1-0nv6.onrender.com/health)

QRGuard is a community-driven digital safety gateway that acts as a secure checkpoint between users and untrusted digital destinations. Whether scanning a physical QR code at a tea stall or opening a suspicious SMS link, QRGuard analyzes the destination, explains potential security risks in plain language, incorporates community threat telemetry, and requires explicit user consent before navigation.

---

## 🌐 Live Production Deployments

- **Live Web App (Vercel):** [https://qr-project1-gamma.vercel.app/](https://qr-project1-gamma.vercel.app/)
- **Live Web App (GitHub Pages):** [https://sharon-jose-antony.github.io/QR-Project/](https://sharon-jose-antony.github.io/QR-Project/)
- **Live Spring Boot 3 Backend (Render):** [https://qr-project-1-0nv6.onrender.com/](https://qr-project-1-0nv6.onrender.com/health)
- **GitHub Repository:** [https://github.com/Sharon-jose-antony/QR-Project](https://github.com/Sharon-jose-antony/QR-Project)

---

## 🌟 Core Product Principles

Unlike traditional scanners that silently and immediately redirect users to unknown websites, QRGuard follows a strict safety lifecycle:

```text
UNTRUSTED QR / LINK
        ↓
QRGuard SECURITY GATEWAY (SSRF, DNS Pinning, CIDR, Redirects)
        ↓
DESTINATION ANALYSIS & RISK ENGINE (0-100 Score)
        ↓
PLAIN-LANGUAGE EXPLANATION (AI + Heuristics)
        ↓
EXPLICIT USER DECISION (Open / Cancel / Confirm)
        ↓
COMMUNITY INTELLIGENCE (Crowdsourced Reports & Reputation)
```

---

## 🛡️ Why QRGuard Exists & Who Uses It

- **The Threat:** Quishing (QR Phishing) and malicious redirect attacks have surged over 580%, targeting physical payment QR codes, parking meters, utility bills, and deceptive SMS links.
- **Who It Protects:**
  - **Local Shopkeepers & Small Vendors:** Defending against counterfeit QR sticker overlays placed over legitimate merchant UPI codes.
  - **Citizens & Senior Citizens:** Protecting against fake electricity bill disconnections, fraudulent pension portals, and credential harvesters.
  - **Public Institutions:** Providing transparent verification of civic notices and public service links.

---

## 🔬 How the Security Pipeline Works

### 1. QR Code Scanning & Safe Extraction (`/scan`)
- Magic-byte file validation (`0x89504E47` for PNG, `0xFFD8FF` for JPEG, `RIFF...WEBP` for WebP).
- Maximum 5MB size and bounded image dimensions (10px to 4096px).
- Extracts URL/Text payload and forwards to the security gateway **without automated redirection**.

### 2. Deep URL Threat Checking (`/check` or `/analyze`)
- **Scheme Validation:** Strict `http`/`https` allowlist (blocks `file://`, `gopher://`, `javascript:`, `data:`).
- **WHATWG Normalization:** Strips embedded credentials (`user:pass@host`) and validates structure.
- **Dual-Stack DNS Resolution:** Resolves all `A` (IPv4) and `AAAA` (IPv6) records.
- **CIDR IP Classification:** Rejects loopback (`127.0.0.0/8`, `::1`), RFC1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Link-Local (`169.254.0.0/16`, `fe80::/10`), and Cloud Metadata endpoints (`169.254.169.254`, `metadata.google.internal`).
- **DNS Pinning:** Custom HTTP/HTTPS agents bind socket connections directly to the pre-validated IP address, eliminating DNS Rebinding / TOCTOU exploits.
- **Hop-by-Hop Redirect Tracing:** Follows up to 5 redirects manually, executing full DNS & CIDR validation on every hop to prevent public-to-private pivot attacks.
- **Buffer Limits:** 1MB maximum content length and 10,000ms timeout.

### 3. Role of Claude AI
- **Deterministic Risk Engine:** Makes 100% of security classifications and risk scores (0–29 Low Risk, 30–59 Suspicious, 60–100 High Risk).
- **Claude Assistant:** Translates technical telemetry (DNS, redirects, entropy, SSL status) into actionable, plain-language explanations for users.
- **Prompt Injection Defense:** Webpage content is treated strictly as untrusted text payloads and isolated from system instructions.

### 5. Persistent QR Reputation & Destination Intelligence
- **Deterministic QR Fingerprinting:** Canonical payload SHA-256 identification recognizes the same physical QR code across time even if destination redirects change.
- **Destination Drift Detection:** Tracks runtime observation history and flags endpoint shifts (`FIRST_OBSERVATION`, `NO_CHANGE`, `FINAL_DESTINATION_CHANGED`, `DOMAIN_CHANGED`, `SCHEME_CHANGED`, `PORT_CHANGED`, `REDIRECT_CHAIN_CHANGED`).
- **Separated Historical vs. Current Signals (Scenarios A–G):** Evaluates prior community threat reports independently from current technical endpoint scans.

---

## 🌐 Live Deployments

- **Vercel Full-Stack Production:** [https://qrguard-eta.vercel.app](https://qrguard-eta.vercel.app)
- **GitHub Pages Showcase:** [https://sharon-jose-antony.github.io/QR-Project/](https://sharon-jose-antony.github.io/QR-Project/)

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v24)
- **npm** or **pnpm**

### 1. Clone & Setup Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
Backend runs at `http://localhost:3001` with an automated `/health` check.

### 2. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173` with reverse-proxy configured to `/api`.

---

## 🧪 Running Automated Security Tests

QRGuard includes a dedicated automated security test suite (`backend/tests/security/*`) covering SSRF, CSRF, IDOR, Password Security, File Uploads, XSS, SQL Injection, and Persistent QR Reputation:

```bash
cd backend
npm test
```

**Results:** 11/11 Test Suites Passed · 130/130 Automated Tests Passing (100% Green).

---

## 📚 Technical Documentation
- [Persistent QR Reputation & Destination Intelligence](docs/QR_REPUTATION.md)
- [Architecture & Threat Model](docs/ARCHITECTURE.md)
- [Security Defenses & Policies](docs/SECURITY.md)
- [Comprehensive Security Audit](docs/SECURITY_AUDIT.md)
- [API Security Matrix](docs/API_SECURITY_MATRIX.md)
- [Automated Test Execution Log](docs/SECURITY_TEST_RESULTS.md)
- [Final Security Scorecard](docs/SECURITY_SCORECARD.md)
