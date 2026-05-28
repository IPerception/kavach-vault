# Kavach -- Implementation Plan

> **Kavach** (kavach) -- Sanskrit for *shield* or *armour*. Your credentials, protected.

## Current Status

**v1.0.0** released 2026-05-26 -- All phases 1-11 complete and shipped.

**v1.1.0** released 2026-05-27 -- Post-release features added:
- Backup to user-chosen location (BackupService + BackupController + Settings modal; destination stored in `~/.kavach/backup-destination.txt`)
- Localhost HTTPS: self-signed PKCS12 certificate generated on first launch using Bouncy Castle (`bcpkix-jdk18on`); keystore at `~/.kavach/kavach.p12`; timestamp-based password stored in `~/.kavach/tls.key`; SSL system properties cleared after Tomcat starts (SslPropertyCleaner)

**Next planned:** Auto-update notification (check GitHub releases API on startup, show dismissible banner).

---

## Overview

A local-first personal credential/password manager. The backend (Spring Boot) runs on `localhost`, the frontend (React) opens in the browser. All data stays on your machine — no cloud, no hosting.

**Stack:** Java 21 + Spring Boot 3.x · React 18 + TypeScript + Vite · TailwindCSS + shadcn/ui · SQLite · AES-256-GCM · JJWT · MapStruct · SpringDoc OpenAPI · React Query · Zustand · React Hook Form + Zod · Vitest + Testing Library

---

## Technology Stack (Full)

### Backend

| Technology | Purpose |
|-----------|---------|
| Java 21 + Spring Boot 3.x | Application framework |
| Spring Security | Auth, JWT filter chain, CSRF, security headers |
| Spring Data JPA + Hibernate | ORM and repository layer |
| SQLite + Hibernate SQLite dialect | Embedded local database |
| Liquibase | Schema versioning and migrations |
| JJWT (io.jsonwebtoken) | JWT creation, signing, and validation |
| Bucket4j | Rate limiting on login and OTP endpoints |
| MapStruct | Compile-time entity ↔ DTO mapping (no manual boilerplate) |
| SpringDoc OpenAPI (Swagger UI) | Auto-generated API documentation for development |
| JavaMail | SMTP email delivery for OTP |
| OWASP Dependency-Check plugin | Dependency vulnerability scanning |
| Lombok | Boilerplate reduction (builders, getters) |
| JUnit 5 + Mockito | Unit and integration testing |
| MockMvc / WebTestClient | REST endpoint testing |

### Frontend

| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript + Vite | UI framework |
| TailwindCSS + shadcn/ui | Styling and accessible component primitives |
| Radix UI (via shadcn/ui) | Accessible modal, dropdown, dialog primitives — focus trapping built in |
| Zustand | Lightweight global state (auth session, lock state, inactivity timer) |
| TanStack Query (React Query) | Server state: API caching, background refetch, loading/error states |
| React Hook Form + Zod | Form management with schema validation |
| Vitest + Testing Library | Component and hook testing |

### Why these additions over the original stack

- **shadcn/ui + Radix UI**: Solves the accessibility gap (focus trapping in modals, ARIA labels) out of the box. Works natively with TailwindCSS.
- **MapStruct**: Eliminates hand-written entity→DTO mapping — a common source of data-leak bugs (accidentally exposing encrypted fields).
- **JJWT**: Purpose-built JWT library with explicit algorithm pinning — safer than rolling your own JWT parsing.
- **TanStack Query**: Handles loading/error/stale state for all API calls so the frontend doesn't need to hand-roll this per component.
- **Zustand**: Simpler than Redux, lighter than Context+Reducer for the vault's auth/lock state.
- **React Hook Form + Zod**: Validates inputs on both frontend (Zod schema) and backend (Bean Validation) — defence in depth.
- **Vitest + Testing Library**: Matches Vite's build tooling; much faster than Jest for this setup.
- **SpringDoc OpenAPI**: Auto-generates Swagger UI at `localhost:8080/swagger-ui.html` during development — useful for testing endpoints without a frontend.

---

## Design Patterns

All implementation phases must follow these patterns. Each pattern maps to a concrete concern in this project.

### Backend Patterns

| Pattern | Where Applied |
|---------|--------------|
| **Repository** | All DB access goes through Spring Data JPA repositories. No raw SQL in service layer. |
| **Service Layer** | Business logic lives exclusively in `@Service` classes. Controllers delegate immediately. |
| **Facade** | `EncryptionService` is a facade over `KeyDerivationService` + AES-GCM primitives. Callers never touch raw crypto APIs. |
| **Factory** | `OtpFactory` creates `OtpEntry` objects (value + expiry + attempt count). Never construct inline. |
| **Strategy** | `EmailNotificationStrategy` implements a `NotificationStrategy` interface — makes TOTP (Phase 10) a drop-in second strategy. |
| **Observer (Spring Events)** | Audit logging uses `ApplicationEventPublisher`. Services publish `CredentialAccessedEvent`, a listener writes to `audit_log`. Decouples audit from business logic. |
| **Builder** | All DTOs and request/response objects use the Builder pattern (via Lombok `@Builder`). |
| **Chain of Responsibility** | Spring Security filter chain — `JwtAuthFilter` → `RateLimitFilter` → controller. Each filter does one thing. |
| **Template Method** | `BaseApiController` defines the standard response envelope structure; subcontrollers fill in the specifics. |
| **Null Object** | `AnonymousKavachSession` implements `KavachSession` with safe no-op methods — returned when no session exists, eliminates null checks throughout. |

### Frontend Patterns

| Pattern | Where Applied |
|---------|--------------|
| **Container / Presentational** | `CredentialListContainer` handles API calls and state; `CredentialListView` is pure rendering. Keeps UI components testable without mocking API. |
| **Custom Hooks** | `useInactivityWatcher`, `useOtpFlow`, `useClipboard`, `usePasswordGenerator` — encapsulate complex side-effect logic away from components. |
| **Compound Components** | `OtpModal` exposes `OtpModal.Trigger`, `OtpModal.Content`, `OtpModal.Timer` — composable without prop drilling. |
| **Observer** | `InactivityWatcher` broadcasts an `activity` event; the Zustand store subscribes and resets the lock timer. |

---

## Phase 1: Project Scaffold & Setup

**Goal:** Working skeleton — both apps start, connect to each other, and hit the database.

- [ ] Create Maven project with two modules: `kavach-backend`, `kavach-frontend` (via Maven frontend plugin)
- [ ] Configure Spring Boot 3.x with Java 21
- [ ] Add dependencies: Spring Web, Spring Data JPA, Spring Security, SQLite dialect, Hibernate, Lombok, JavaMail, JJWT, MapStruct, Bucket4j, SpringDoc OpenAPI
- [ ] Configure SQLite datasource + Hibernate auto-DDL (dev) / Liquibase (prod)
- [ ] Enable `PRAGMA journal_mode=WAL` via datasource init script — prevents read/write locking
- [ ] Scaffold React app with Vite + TypeScript + TailwindCSS + shadcn/ui
- [ ] Configure React dev proxy → `localhost:8080`
- [ ] Single `java -jar kavach.jar` launches both (Spring Boot serves React build as static files)
- [ ] Write `start.bat` / `start.sh` launcher scripts with port-fallback logic (try 8080 → 8090 → 8100)
- [ ] Define global `GlobalExceptionHandler` (`@ControllerAdvice`) returning RFC 7807 `ProblemDetail` — do this before any endpoint is written
- [ ] Add `WebMvcConfigurer` with explicit CORS restriction (dev: allow `localhost:5173`; prod: same-origin only)

---

## Phase 2: Database Schema & Domain Model

**Goal:** Define all entities and relationships before writing any logic.

### Entities

```
vault_user         — app login account (single user for now)
  id, username, master_password_hash, pbkdf2_salt, email, created_at

credential         — one stored credential
  id, user_id, purpose, username, encrypted_password, iv, dek_encrypted, salt, created_at, updated_at
  UNIQUE constraint: (user_id, purpose)

audit_log          — every access/modify event
  id, user_id, credential_id, action (VIEW/CREATE/UPDATE/DELETE), timestamp, ip

app_config         — persisted application settings (replaces application.properties for user config)
  key, value_encrypted, updated_at
```

- [ ] Write JPA entities with proper annotations
- [ ] Add `UNIQUE` constraint on `credential(user_id, purpose)` — prevents duplicate entries
- [ ] Write DTOs (never expose entities to API layer) — use MapStruct mappers for all conversions
- [ ] Write Liquibase migration scripts for schema versioning
- [ ] Write JPA repositories
- [ ] Enable `PRAGMA journal_mode=WAL` in Liquibase init changeset

---

## Phase 3: Encryption Engine

**Goal:** Rock-solid, tested encryption before any credential is persisted.

- [ ] `EncryptionService` (Facade) — AES-256-GCM encrypt/decrypt; callers never use raw `Cipher` directly
- [ ] `KeyDerivationService` — PBKDF2WithHmacSHA256, 600,000 iterations, random salt
- [ ] Key hierarchy:
  ```
  Master Password → PBKDF2 → Master Key
  Master Key → AES-GCM → encrypts per-credential DEK
  DEK → AES-GCM → encrypts actual password
  ```
- [ ] Use `char[]`/`byte[]` for all secrets — zero out after use, never `String`
- [ ] `SessionKeyStore` bean — holds the in-memory master key; exposes `storeKey(byte[])`, `getKey()`, `clear()`. `clear()` explicitly zeros the byte array before nulling the reference
- [ ] Unit test encrypt → decrypt round-trip
- [ ] Unit test key derivation determinism (same password + salt = same key)
- [ ] Unit test that `SessionKeyStore.clear()` zeroes the key bytes

---

## Phase 4: Authentication & Session

**Goal:** Lock screen, setup wizard, and session lifecycle that gates the entire app.

- [ ] **First-launch wizard** (detect via absence of `vault_user` row):
  - Step 1: Set master password (show `PasswordStrengthMeter`; require ≥ 12 chars or passphrase equivalent)
  - Step 2: Set recovery email for OTP
  - Step 3: SMTP configuration
  - Warning displayed: **"If you forget your master password, all credentials are unrecoverable. Export your vault regularly."**
- [ ] Login endpoint: validate master password → derive key → store in `SessionKeyStore` (in-memory, never persisted)
- [ ] JWT issued on successful login:
  - Lifetime: **10 minutes** (matches auto-lock timeout — eliminates JWT/session expiry mismatch)
  - Transport: `httpOnly`, `SameSite=Strict`, `Secure` cookie — never `localStorage`
  - Algorithm pinned to `HS256` via JJWT explicit algorithm selection
- [ ] `JwtAuthFilter` validates cookie on every `api/**` request; responds `401` on expiry
- [ ] Auto-lock: `InactivityWatcher` (frontend) fires after 10 min of no user interaction → calls `/api/auth/logout`
- [ ] Logout: `SessionKeyStore.clear()` → zero master key → invalidate cookie
- [ ] **Change master password flow** (transactional):
  1. Verify current master password
  2. Derive new master key from new password + new salt
  3. For every credential: decrypt DEK with old master key, re-encrypt DEK with new master key
  4. Update `master_password_hash`, `pbkdf2_salt`, and all `dek_encrypted` in a single `@Transactional` method
  5. Force logout after completion
- [ ] Account lockout after 5 failed login attempts (15-min cooldown, tracked in-memory via Bucket4j)
- [ ] Spring Security config: all `/api/**` routes require valid JWT except `/api/auth/**`
- [ ] **Tests:** Integration tests for login, logout, auto-lock expiry, account lockout, master password change + credential re-encryption

---

## Phase 5: Core Credential API

**Goal:** Full CRUD for credentials via REST API.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/credentials` | Add new credential |
| GET | `/api/credentials` | List all (purpose + username only, no password) |
| GET | `/api/credentials/{id}/preview` | Returns partial password (first 3 chars + `***`) |
| POST | `/api/credentials/{id}/request-otp` | Generates OTP, sends to email |
| POST | `/api/credentials/{id}/reveal` | Validates OTP, returns full password |
| PUT | `/api/credentials/{id}` | Update credential |
| DELETE | `/api/credentials/{id}` | Delete credential |
| GET | `/api/audit-log` | View access history (paginated) |

- [ ] Implement each endpoint in controller → service → repository chain (Service Layer pattern)
- [ ] Handle `DataIntegrityViolationException` from duplicate `purpose` with a `409 Conflict` `ProblemDetail` response
- [ ] Audit logging via Spring `ApplicationEventPublisher` (Observer pattern) — never inline in service methods
- [ ] Input validation with Bean Validation (`@Valid`, `@NotBlank`, etc.)
- [ ] MapStruct mappers for all entity ↔ DTO conversions
- [ ] **Tests:** MockMvc tests for every endpoint (happy path + validation errors + auth failures)

---

## Phase 6: OTP Service

**Goal:** Email-based OTP for revealing full passwords.

- [ ] `OtpFactory` creates `OtpEntry` (code, expiry, attempt count, credential ID) — Factory pattern
- [ ] Generate cryptographically random 6-digit OTP (`SecureRandom`)
- [ ] Store OTP in-memory (`ConcurrentHashMap<credentialId, OtpEntry>`) with 5-min expiry
- [ ] `ScheduledExecutorService` sweeps expired OTPs every minute
- [ ] Send OTP via JavaMail
- [ ] SMTP credentials stored in `app_config` table (encrypted with master key, loaded into memory on unlock) — never in `application.properties` plaintext
- [ ] Validate OTP using `MessageDigest.isEqual()` for constant-time comparison (prevents timing attacks)
- [ ] Single-use: delete OTP entry after successful validation
- [ ] Throttle: max 3 OTP requests per credential per 15 min (Bucket4j)
- [ ] `NotificationStrategy` interface with `EmailNotificationStrategy` implementation — Strategy pattern (makes TOTP a drop-in later)
- [ ] **Tests:** OTP generation, expiry sweep, throttle enforcement, constant-time validation

---

## Phase 7: React Frontend

**Goal:** Complete, usable UI with accessible components and coherent state management.

### Global State (Zustand)

```typescript
interface KavachStore {
  status: 'locked' | 'unlocked' | 'setup';
  lastActivity: number;
  lock: () => void;
  recordActivity: () => void;
}
```

### Screens

| Screen | Description |
|--------|-------------|
| Setup Wizard | Master password (with strength meter), email, SMTP config, no-recovery warning |
| Lock Screen | Master password entry, unlock button |
| Kavach Dashboard | Searchable/filterable list of credentials (purpose + username, no passwords visible) |
| Add Credential | Form (React Hook Form + Zod): purpose, username, password (strength meter + generator) |
| Credential Detail | Shows partial password, "Reveal" button triggers OTP flow |
| OTP Verification Modal | Enter OTP code, countdown timer |
| Full Password View | Revealed password with auto-vanish countdown (60s), copy button |
| Edit Credential | Pre-filled form |
| Audit Log | Paginated table of access events |
| Settings | SMTP config, change master password, export vault |

### Components

- [ ] `PasswordStrengthMeter` — used on Setup Wizard and Add/Edit Credential
- [ ] `PasswordGenerator` (configurable length, symbols, numbers)
- [ ] `CountdownTimer` (auto-vanish)
- [ ] `MaskedPassword` (partial display)
- [ ] `OtpModal` — compound component; uses Radix UI Dialog for focus trapping
- [ ] `ClipboardCopy` (auto-clears clipboard after 30s)
- [ ] `InactivityWatcher` hook — broadcasts activity events; Zustand store resets timer
- [ ] `CredentialSearch` — client-side filter by purpose/username (move from Phase 10 — essential for usability)

### Patterns in frontend

- [ ] Container / Presentational split for all data-fetching screens
- [ ] Custom hooks: `useInactivityWatcher`, `useOtpFlow`, `useClipboard`, `usePasswordGenerator`
- [ ] TanStack Query for all API calls (loading, error, stale states handled uniformly)
- [ ] All modals use Radix UI primitives — focus trapping and ARIA roles are automatic
- [ ] All interactive elements have ARIA labels; OTP input auto-focuses on modal open

- [ ] **Tests:** Vitest + Testing Library for `PasswordStrengthMeter`, `OtpModal`, `InactivityWatcher` hook, `ClipboardCopy`

---

## Phase 8: Security Hardening

- [ ] Rate limiting on login + OTP endpoints (Bucket4j) — already wired in Phase 4/6; verify limits are correct
- [ ] Account lockout after 5 failed login attempts (15-min cooldown) — verify implementation from Phase 4
- [ ] CSRF protection (Spring Security — `SameSite=Strict` cookie makes CSRF tokens optional but add them anyway)
- [ ] Security response headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP: `default-src 'self'`)
- [x] HTTPS on localhost via self-signed cert -- generated in-process with Bouncy Castle (keytool not available in jpackage runtime); cert stored in `~/.kavach/kavach.p12`
- [ ] OWASP Dependency-Check Maven plugin — fail build on CVSS ≥ 7
- [ ] Validate and sanitize all user inputs (Bean Validation backend + Zod frontend)
- [ ] Verify `SessionKeyStore.clear()` is called on every exit path (logout, lock, shutdown hook)
- [ ] Add Spring Boot shutdown hook to zero master key on `SIGTERM`
- [ ] **Tests:** Verify rate limiting triggers; verify security headers present; verify locked endpoints return 401

---

## Phase 9: Packaging & Distribution

- [ ] Maven build: `mvn clean package` produces single fat JAR named `kavach.jar`
- [ ] React build output copied into `src/main/resources/static/` (served by Spring Boot, same origin — no CORS needed)
- [ ] `start.bat` / `start.sh` with port-fallback logic (8080 → 8090 → 8100) and auto-backup logic:
  ```
  On startup: copy kavach.db → kavach.db.backup-{date}; keep last 5 backups
  ```
- [ ] **Encrypted JSON export** (moved from Phase 10 — critical backup feature):
  - Export all credentials decrypted and re-encrypted with a user-supplied export passphrase
  - Import verifies passphrase before restoring
  - Never export plaintext
- [ ] First-launch wizard detection: check for absence of `vault_user` row; redirect to `/setup`
- [ ] Port stored in `app_config` table; launcher script reads it before opening the browser
- [ ] Optional: `jpackage` to wrap into native `.exe` / `.dmg` installer
- [ ] Optional: `java.awt.SystemTray` icon for background operation (Windows/macOS)

---

## Phase 10: Enhancements (Post-MVP)

- [ ] Password generator presets (PIN, passphrase, alphanumeric)
- [ ] Credential categories/tags with filtering
- [x] TOTP (Google Authenticator) -- DONE. Implemented as TotpProvider/TotpService (not NotificationStrategy).
      Setup wizard includes QR enrolment step. OtpModal uses authenticator code for reveals.
      Settings page has re-enrolment flow. NotificationStrategy remains for email delivery only.
- [ ] Dark/light theme toggle (five colour accent themes exist; true dark/light mode switch is separate)
- [ ] Browser extension (autofill via local API)
- [ ] Multi-user support (the schema already has `user_id` -- unlock the UI and auth layer)

---

## Phase 11: Native Packaging and Service Mode

**Goal:** Any user on Windows, macOS, or Linux can install Kavach like a normal desktop app -- no
Java pre-installed, no terminal required -- and the backend starts automatically on login.

### Packaging options (pick one per platform)

| Approach | User experience | JRE required |
|----------|----------------|--------------|
| Fat JAR + start.bat/sh (current) | User must have Java 21 and run a script | Yes |
| jpackage native installer | Double-click .exe/.dmg/.deb; JRE bundled | No |
| GraalVM native image | Single binary, no JRE at all; harder to build | No |

**Recommended path:** jpackage for all three platforms. It bundles the JRE inside the installer so
the user experience is identical to any other desktop app.

### jpackage integration steps

- [ ] Add `jpackage` Maven plugin or Gradle task that:
      - Takes `kavach.jar` as input
      - Bundles a trimmed JRE (use `jlink` to include only the modules Kavach needs)
      - Produces `.exe` (Windows), `.dmg` / `.pkg` (macOS), `.deb` / `.rpm` (Linux)
- [ ] Set app metadata: name "Kavach", icon, version, vendor
- [ ] Configure install directory (e.g. `C:\Program Files\Kavach` on Windows)
- [ ] Wire the installer to place `kavach.db` in the user data dir
      (`%APPDATA%\Kavach` on Windows, `~/Library/Application Support/Kavach` on macOS,
      `~/.local/share/kavach` on Linux) so the DB survives app upgrades

### Run as a system service

Running as a service means Kavach starts automatically on login/boot and stays running in the
background. The browser extension (Phase 10) depends on this.

**Windows**
- [ ] Bundle WinSW (Windows Service Wrapper) XML config in the installer
- [ ] Installer runs `winsw install` to register Kavach as a Windows Service
- [ ] Service runs as the current user (not SYSTEM) so it can read the user's data dir
- [ ] Uninstaller runs `winsw uninstall`

**macOS**
- [ ] Create a launchd plist (`~/Library/LaunchAgents/com.kavach.plist`)
- [ ] Installer copies the plist and runs `launchctl load` to enable it
- [ ] Service starts on user login (LaunchAgent, not LaunchDaemon -- keeps user context)

**Linux**
- [ ] Create a systemd user unit file (`~/.config/systemd/user/kavach.service`)
- [ ] Installer runs `systemctl --user enable --now kavach`
- [ ] Runs as a user service (not root) via `systemctl --user`

### System tray icon

Already noted in Phase 9 as optional. Required once the app runs as a background service.

- [ ] Use `java.awt.SystemTray` to add a tray icon (works on Windows and macOS; Linux depends on DE)
- [ ] Tray menu: Open Kavach (launches browser to localhost:port), Lock vault, Quit
- [ ] Show a tooltip with the current port when hovering the icon
- [ ] On vault lock, tray icon changes colour/badge to indicate locked state

### Security note for service mode

- The HTTP server must still bind to `127.0.0.1` only -- never `0.0.0.0` -- so only the local
  machine can reach it.
- The JWT cookie remains `httpOnly`, `SameSite=Strict`, `Secure` even in service mode.
- The auto-lock timer (10 min inactivity) still applies; service keeps running but vault is locked.

---

### Enterprise Upgrade Path: HashiCorp Vault

If this project ever evolves beyond a single-user local tool into a **team or enterprise credential manager**, replace the application-layer encryption engine with HashiCorp Vault.

**Why Vault is not used now:**
This project is intentionally local-first and self-contained (`java -jar kavach.jar`, zero extra installs). Vault is a standalone server that must be separately deployed, configured, and unsealed — the wrong trade-off for a personal desktop app.

**When to make the switch:**

| Signal | What it means |
|--------|--------------|
| Multiple users need shared credential access | Vault's RBAC policies and namespaces handle this natively |
| Secrets need to rotate automatically | Vault's dynamic secrets engine rotates DB passwords, API keys on a schedule |
| Audit requirements need a tamper-evident log | Vault's audit backend writes to syslog / file with HMAC chaining |
| CI/CD pipelines need to pull secrets | Vault's AppRole / Kubernetes auth methods are the standard solution |

**What changes in the codebase:**
- `EncryptionService` + `KeyDerivationService` + `SessionKeyStore` are replaced by calls to the **Vault Transit Secrets Engine** (encryption-as-a-service — Vault holds the keys, never the app)
- `app_config` credential storage moves to **Vault KV Secrets Engine v2**
- Authentication moves from master-password login to **Vault token / AppRole auth**
- The Spring Boot app gets the `spring-vault-core` dependency and a `VaultTemplate` bean

The `NotificationStrategy` interface, Repository pattern, Service Layer, and audit Observer remain unchanged — only the crypto and storage backends swap out.

---

## Implementation Order

```
Phase 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11
 Setup   DB  Crypto Auth  API  OTP  UI  Sec  Pkg Extra Install/Svc
```

Each phase is a shippable increment:
- Phase 4: lockable app with setup wizard
- Phase 5+6+7: fully working vault
- Phase 8+9: hardened and distributable
- Phase 10: enhancements (TOTP done; remaining: presets, tags, dark mode, extension, multi-user)
- Phase 11: native installer + background service + system tray

**Testing rule:** every phase ships with its tests. No deferred testing.

---

## Concerns & Mitigations

| Concern | Mitigation |
|---------|-----------|
| DB file theft | AES-encrypt each field (application-layer encryption) |
| Memory scraping | `char[]`/`byte[]` for secrets, zero via `SessionKeyStore.clear()` on every exit path — never `String` |
| Forgotten master password | By design, unrecoverable. Warn on setup wizard. Encrypted export is the backup strategy. |
| Brute force on master password | PBKDF2 with 600,000 iterations; account lockout after 5 failed attempts |
| JWT token theft | 10-min lifetime; `httpOnly`, `SameSite=Strict`, `Secure` cookie; never `localStorage` |
| JWT / session expiry mismatch | JWT lifetime = auto-lock timeout (both 10 min) — no race condition |
| Dependency vulnerabilities | OWASP Dependency-Check in Maven build; fail on CVSS ≥ 7 |
| SMS OTP hijacking | Email OTP only in MVP; TOTP (authenticator app) as Phase 10 upgrade |
| Unencrypted backups | Encrypted JSON export only — never plaintext |
| SMTP credentials exposure | Stored in `app_config` table encrypted with master key; loaded to memory on unlock |
| OTP timing attack | Constant-time comparison via `MessageDigest.isEqual()` |
| Duplicate credentials | `UNIQUE(user_id, purpose)` DB constraint + 409 response |
| Port conflict | Launcher script tries 8080 → 8090 → 8100; stores chosen port in `app_config` |
| SQLite locking | WAL mode enabled via `PRAGMA journal_mode=WAL` at init |
| Master password change | Full DEK re-encryption in a single `@Transactional` method + forced logout |
| Data loss (corrupted DB) | Auto-backup on startup (last 5 copies); encrypted export for off-device backup |
