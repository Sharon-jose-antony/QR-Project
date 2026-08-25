# QRGuard API Security Matrix

| Endpoint | Method | Auth | Role | Validation | Rate Limit | CSRF Defense | Authorization / IDOR | Security Notes |
|---|---|---|---|---|---|---|---|---|
| `/api/auth/register` | POST | None | Anonymous | Zod (email, username, password complexity) | 5 / hour | SameSite=Strict + Origin | N/A | Generic conflict error, Argon2id hash |
| `/api/auth/login` | POST | None | Anonymous | Zod (email, password) | 10 / 15 min | SameSite=Strict + Origin | N/A | Constant-time password verify, generic 401 |
| `/api/auth/logout` | POST | Required | User / Admin | None | None | SameSite=Strict + Origin | Session userId match | Destroys session, clears cookie |
| `/api/auth/me` | GET | Required | User / Admin | None | None | Read-only | Session-bound | Returns authenticated profile only |
| `/api/url/analyze` | POST | Optional | Any | Zod (max 2048 chars, valid URL) | 30 / min | SameSite=Strict + Origin | Session/Anon tracking | Centralized SafeFetch, SSRF gateway, AI explain |
| `/api/qr/analyze` | POST | Optional | Any | Multer (MIME, magic bytes, dimensions, 5MB max) | 20 / min | SameSite=Strict + Origin | Session/Anon tracking | Disk UUID buffer, immediate unlink, SafeFetch |
| `/api/community` | GET | None | Anonymous | None | None | Read-only | N/A | Public aggregated data only; zero PII |
| `/api/reports` | POST | Required | User / Admin | Zod (URL, category, description) | 20 / hour | SameSite=Strict + Origin | Session userId bound | PII-stripped from public listings |
| `/api/domains/:hostname` | GET | None | Anonymous | Regex hostname check | None | Read-only | N/A | Aggregated threat indicators & domain history |
| `/api/analyses` | GET | Required | User / Admin | Query pagination | None | Read-only | Filtered by `req.session.userId` | User A can only see User A's scans |
| `/api/analyses/:id` | GET | Required | User / Admin | UUID validation | None | Read-only | `checkAnalysisOwnership()` (404 on mismatch) | IDOR attempt logged as security event |
| `/api/admin/security/events` | GET | Required | Admin | Pagination, severity, type | 100 / min | Read-only | Server-side `requireAdmin` check | Zero secrets or sensitive payloads logged |
| `/api/admin/security/ssrf` | GET | Required | Admin | None | 100 / min | Read-only | Server-side `requireAdmin` check | Real database query metrics over 30 days |
| `/api/admin/security-lab/run` | POST | Required | Admin | Zod (testType enum) | 10 / min | SameSite=Strict + Origin | Server-side `requireAdmin` check | Isolated synthetic fixtures only; zero real attacks |
| `/api/admin/audit-logs` | GET | Required | Admin | Pagination | 100 / min | Read-only | Server-side `requireAdmin` check | Safe structured audit metadata |
| `/api/admin/users` | GET | Required | Admin | Pagination | 100 / min | Read-only | Server-side `requireAdmin` check | Never returns password hashes |
