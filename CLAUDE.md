# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kavach** (कवच, Sanskrit for *shield*) is a local-first personal password manager. A single `java -jar kavach.jar` launches both the Spring Boot backend and serves the React frontend as static files. All data stays on disk — no cloud, no external services except optional SMTP for OTP delivery.

## Build & Run

```bash
# Full build (produces kavach.jar with frontend bundled)
mvn clean package

# Native app-image installer (run from project root -- builds frontend first, then packages)
# Output: dist/Kavach/Kavach.exe (Windows)
mvn clean install -P native-installer

# Backend only (dev mode)
mvn spring-boot:run -pl kavach-backend

# Frontend dev server (with proxy to localhost:8080)
cd kavach-frontend && npm run dev

# Run tests — backend
mvn test -pl kavach-backend

# Run tests — single backend test class
mvn test -pl kavach-backend -Dtest=CredentialServiceTest

# Run tests — frontend
cd kavach-frontend && npm test

# Run a single frontend test file
cd kavach-frontend && npx vitest run src/hooks/useOtpFlow.test.ts
```

The launcher script (`start.bat` / `start.sh`) tries ports 8080 → 8090 → 8100 on conflict and auto-backs up `kavach.db` on startup (retains last 5 copies).

## Releasing

```bash
# 1. Build the app-image (from project root)
mvn clean install -P native-installer

# 2. Delete any runtime files left in dist/Kavach/ from testing (kavach.port, kavach.db)
# 3. Zip dist/Kavach/ manually via File Explorer -> right-click -> Compress to ZIP
#    Name it: Kavach-vX.Y.Z-windows-x64.zip

# 4. Commit all changes, then tag and push
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z

# 5. Create GitHub release with the zip as a release asset
gh release create vX.Y.Z "dist/Kavach-vX.Y.Z-windows-x64.zip" \
  --title "Kavach vX.Y.Z" \
  --notes "Release notes here"
```

Notes:
- WiX 3.x is installed at C:\Program Files (x86)\WiX Toolset v3.14\bin -- add to PATH to build .exe installers
- .exe installer format is blocked by Windows Smart App Control; use app-image (default) for distribution
- dist/ is gitignored; the zip is attached only as a GitHub release asset

Swagger UI available at `http://localhost:8080/swagger-ui.html` during development.

## Architecture

### Module Layout (Maven multi-module)

```
kavach-backend/   — Spring Boot 3.x, Java 21
kavach-frontend/  — React 18 + TypeScript + Vite
```

The React build output is copied into `kavach-backend/src/main/resources/static/` so both run on the same origin (no CORS in production).

### Backend Layer Order

```
Controller → Service → Repository (JPA)
              ↓
           EncryptionService (Facade)
              ↓
           KeyDerivationService + SessionKeyStore
```

- Controllers delegate immediately to `@Service` classes — no business logic in controllers.
- All DB access goes through Spring Data JPA repositories — no raw SQL in service layer.
- `EncryptionService` is a facade; callers never use `Cipher` directly.

### Encryption Key Hierarchy

```
Master Password + Salt → PBKDF2WithHmacSHA256 (600k iterations) → Master Key (in-memory only)
Master Key + IV₁ → AES-256-GCM → encrypts per-credential DEK (stored in DB)
DEK + IV₂ → AES-256-GCM → encrypts actual password (stored in DB)
```

`SessionKeyStore` holds the master key in memory as `byte[]` and zeros it on logout, lock, or JVM shutdown. **Never use `String` for secrets** — always `char[]`/`byte[]`, zeroed after use.

### Auth & Session

- JWT issued as `httpOnly`, `SameSite=Strict`, `Secure` cookie — never `localStorage`.
- JWT lifetime: **10 minutes** (matches the auto-lock timer to avoid expiry mismatches).
- Algorithm pinned to `HS256` via JJWT explicit selection.
- Spring Security filter chain: `SecurityHeadersFilter` → `RateLimitFilter` (Bucket4j) → `JwtAuthFilter` → controller.
- Public routes: `/api/auth/**`. Everything else under `/api/**` requires a valid JWT.
- Account lockout: 5 failed login attempts → 15-min cooldown (Bucket4j, in-memory).

### OTP Reveal Flow

1. `POST /api/credentials/{id}/request-otp` — OtpFactory generates a `SecureRandom` 6-digit code, stores it in-memory (`ConcurrentHashMap`) with 5-min expiry, sends via JavaMail.
2. `POST /api/credentials/{id}/reveal` — validates OTP with `MessageDigest.isEqual()` (constant-time), deletes OTP entry (single-use), decrypts and returns the password.
3. Frontend auto-vanishes the password after 60s; clipboard auto-clears after 30s.
4. Rate limit: max 3 OTP requests per credential per 15 min.

### Audit Logging

Uses Spring's `ApplicationEventPublisher` (Observer pattern). Services publish events (`CredentialAccessedEvent`, `CredentialCreatedEvent`, etc.); `AuditLogListener` writes to `audit_log` asynchronously. Never inline audit writes in service methods.

### Frontend State

```typescript
// Zustand store — auth/lock state only
{ status: 'locked' | 'unlocked' | 'setup', lastActivity: number }
```

TanStack Query handles all API server state (caching, loading, error, background refetch). React Hook Form + Zod for forms, with matching Bean Validation on the backend.

## Key Patterns & Conventions

### Backend

| Pattern | Application |
|---------|-------------|
| Repository | All DB access via Spring Data JPA repos |
| Service Layer | Business logic only in `@Service`; controllers delegate immediately |
| Facade | `EncryptionService` hides raw crypto APIs |
| Factory | `OtpFactory` creates `OtpEntry`; never construct inline |
| Strategy | `NotificationStrategy` interface → `EmailNotificationStrategy` (TOTP is a future second impl) |
| Observer | Spring `ApplicationEventPublisher` for audit events |
| Builder | All DTOs use Lombok `@Builder` |
| Null Object | `AnonymousKavachSession` implements `KavachSession` with no-ops; eliminates null checks |

### Frontend

| Pattern | Application |
|---------|-------------|
| Container/Presentational | Data-fetching containers + pure rendering views |
| Custom Hooks | `useInactivityWatcher`, `useOtpFlow`, `useClipboard`, `usePasswordGenerator` |
| Compound Components | `OtpModal.Trigger`, `OtpModal.Content`, `OtpModal.Timer` |

### API Error Responses

All errors return RFC 7807 `ProblemDetail` from `GlobalExceptionHandler` (`@ControllerAdvice`). Handle `DataIntegrityViolationException` (duplicate purpose) as `409 Conflict`.

## Database

SQLite (`kavach.db`) with WAL mode (`PRAGMA journal_mode=WAL`) enabled at init to prevent read/write locking. Schema versioned with Liquibase.

Tables: `vault_user`, `credential`, `audit_log`, `app_config`.

SMTP credentials and port config live in `app_config` (encrypted with master key), **not** in `application.properties`.

## Security Constraints

- OWASP Dependency-Check runs in the Maven build; fails on CVSS ≥ 7.
- Secrets (`byte[]`/`char[]`) must be zeroed after use — verify `SessionKeyStore.clear()` is called on every exit path (logout, lock, shutdown hook).
- OTP comparison must use `MessageDigest.isEqual()` — not `String.equals()`.
- DEK re-encryption on master password change must be a single `@Transactional` method covering all credentials.
- Security headers set by `SecurityHeadersFilter`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `CSP: default-src 'self'`.

## Testing Rule

Every phase ships with its tests. No deferred testing. Backend: JUnit 5 + Mockito + MockMvc. Frontend: Vitest + Testing Library.

## Planned Features (in priority order)

### 1. Distribution Landing Page
A GitHub Pages site serving a single-page product overview with screenshots and a download button
pointing to the latest GitHub release zip. Lives in a `docs/` folder or `gh-pages` branch.
Built with the same React + Tailwind stack already in the project.

### 2. Backup to User-Chosen Location
A Settings option to choose a secondary backup destination (external drive, NAS, any local folder).
On each startup the launcher copies `kavach.db` to that folder alongside the existing `~/.kavach/`
auto-backup. Backend: new `backup.destination` entry in `app_config` (encrypted). Frontend: folder
picker in Settings.

### 3. Auto-Update Notification
On startup, call `https://api.github.com/repos/IPerception/kavach-vault/releases/latest` and compare
the tag name against the running version (`kavach.version` property). If a newer version exists,
show a dismissible banner in the UI with a link to the releases page. No auto-install -- notification
only. No backend change needed; purely a frontend hook on app load.

### 4. macOS Build
Run `mvn clean install -P native-installer` on a macOS machine. jpackage produces a `.dmg` by
default. Attach to GitHub release as `Kavach-vX.Y.Z-macos.dmg`. Code signing via Apple Developer
ID certificate is required to avoid Gatekeeper blocking.

### 5. Linux Build
Run `mvn clean install -P native-installer` on a Linux machine. jpackage produces a `.deb`
(requires `dpkg-dev`) or `.rpm` (requires `rpm-build`). Attach to GitHub release accordingly.
