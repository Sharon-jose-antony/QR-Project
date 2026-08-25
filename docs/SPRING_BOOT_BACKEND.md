# QRGuard — Spring Boot 3 Backend Specification

QRGuard provides a complete, production-grade **Spring Boot 3 (Java 17)** backend alongside the Node.js Express backend. Both implementations adhere strictly to the exact same REST API contract and JSON response structures, allowing the React frontend to communicate with either backend interchangeably.

---

## 🏛️ Architecture Overview

```
backend-springboot/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/qrguard/
│   │   │   ├── QrGuardApplication.java               # Spring Boot Application Entrypoint
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java                # CORS, Session & CSRF Security Policy
│   │   │   │   └── GlobalExceptionHandler.java        # Standardized { success, error } Responses
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java                # /api/auth/register, /login, /me, /logout
│   │   │   │   ├── UrlAnalysisController.java         # /api/url/analyze
│   │   │   │   ├── QrController.java                  # /api/qr/analyze, /api/qr/{id}/history
│   │   │   │   ├── CommunityController.java           # /api/community/report, /intel
│   │   │   │   └── HealthController.java              # /health
│   │   │   ├── dto/                                   # Request & Response Contracts
│   │   │   ├── model/                                 # JPA SQLite / PostgreSQL Entities
│   │   │   ├── repository/                            # Spring Data JPA Repositories
│   │   │   ├── security/
│   │   │   │   ├── auth/PasswordHasher.java           # Argon2id + BCrypt
│   │   │   │   ├── ssrf/IpValidator.java              # Dual-stack IPv4/IPv6 CIDR Filtering
│   │   │   │   ├── ssrf/SafeHttpFetcher.java          # Pre-socket DNS pinning & 5-hop tracer
│   │   │   │   ├── risk/RiskEngine.java               # Deterministic Quishing & Phishing Scorer
│   │   │   │   └── qr/
│   │   │   │       ├── QrIdentityService.java         # SHA-256 Canonical Normalization
│   │   │   │       ├── DestinationDriftService.java   # Observation History Classifier
│   │   │   │       ├── QrReputationEngine.java        # Weighted Reports & Scenarios A–G
│   │   │   │       └── QrDecoderService.java          # ZXing Barcode Matrix Decoder
│   │   │   └── service/                               # Business Logic Services
│   │   └── resources/
│   │       └── application.yml                        # Server port 3001, CORS, SQLite DB
│   └── test/
│       └── java/com/qrguard/
│           ├── QrReputationTests.java                 # Scenarios A–G & SHA-256 Tests
│           └── SsrfProtectionTests.java               # Loopback, RFC1918 & Metadata Tests
```

---

## 🚀 How to Run the Spring Boot Backend

### 1. Build and Run via Maven
```bash
cd backend-springboot
mvn clean spring-boot:run
```
The server will start on `http://localhost:3001`.

### 2. Run Automated Test Suite
```bash
cd backend-springboot
mvn test
```

---

## 🔄 Switching Between Backends

| Backend | Start Command | Default Port | Database |
| :--- | :--- | :--- | :--- |
| **Node.js Express** | `cd backend && npm run dev` | `3001` | SQLite (`prisma/dev.db`) |
| **Spring Boot 3** | `cd backend-springboot && mvn spring-boot:run` | `3001` | SQLite (`qrguard.db`) |

Because both backends listen on `port 3001` with identical routes and JSON formats, the React frontend (`frontend/`) interacts seamlessly with whichever backend is running.
