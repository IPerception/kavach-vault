# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kavach** (कवच, Sanskrit for *shield*) is a local-first personal password manager. A single `java -jar kavach.jar` launches both the Spring Boot backend and serves the React frontend as static files. All data stays on disk — no cloud, no external services.

## Build & Run

```bash
# Full build (produces kavach.jar with frontend bundled)
mvn clean package

# Native app-image installer (run from project root -- builds frontend first, then packages)
# Output: dist/Kavach/Kavach.exe (Windows)
mvn clean install -P native-installer

# Backend only (dev mode)
mvn spring-boot:run -pl kavach-backend

# Frontend dev server (with proxy to https://localhost:8080)
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

The backend needs Java 25 (Spring Boot 4.1.3). The Maven build downloads Node v24.22.3 into
`kavach-frontend/node/`; after changing `nodeVersion`, delete that directory before the next
build (see the comment in `kavach-frontend/pom.xml`).

CI (`.github/workflows/ci.yml`) runs `mvn -B clean verify` on every PR and push to `main`.

The launcher script (`start.bat` / `start.sh`) tries ports 8080 → 8090 → 8100 on conflict and auto-backs up `kavach.db` on startup (retains last 5 copies).

## Contributing Workflow

Every change goes on a branch and lands via pull request. Do not commit directly to
`main`, including for one-file or config-only changes.

```bash
git checkout -b <topic>
# make changes, then verify before committing
mvn test -pl kavach-backend
cd kavach-frontend && npm run test:run && npm run build

git add <files>
git commit -m "..."
git push -u origin <topic>
gh pr create --fill
```

Verify before committing, not after. Only the merge to `main` is done by the repo owner.

## Releasing

Releases are built by `.github/workflows/release.yml`, triggered by a `vX.Y.Z` tag.
Tags are the one thing pushed to `main` directly - a tag is not a change to the tree.

1. In a PR, bump the version in all five places (guarded by
   `kavach-backend/src/test/java/com/kavach/VersionConsistencyTest.java`): root `pom.xml`
   `<version>`, the `<parent><version>` in both child poms, and `"version"` in
   `kavach-frontend/package.json` and `package-lock.json`. jpackage's `--app-version` uses
   `${project.version}`.
2. Merge the PR, then tag main and push the tag:

   ```bash
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. The workflow checks the tag is on `main` and equals the root pom version, reruns all
   tests, builds the Windows app-image on the latest Temurin 25, and creates a **draft**
   GitHub release with `Kavach-vX.Y.Z-windows-x64.zip`, `kavach-vX.Y.Z.jar` and
   `SHA256SUMS.txt`.
4. Download and test the draft, then click Publish. Drafts are invisible to the in-app
   update check (it reads `releases/latest`), so users see a release only once published.

A Java security refresh is just a new patch tag: setup-java runs with `check-latest`, so the
workflow always bundles the newest Temurin 25 patch and nothing needs installing locally.
`.github/workflows/java-patch-reminder.yml` checks weekly and opens an issue when Adoptium
has a newer Temurin 25 than the latest release bundles.

Notes:
- Do not build or zip releases by hand any more; use the workflow.
- Local `mvn clean install -P native-installer` still produces `dist/Kavach/` for testing;
  `dist/` is gitignored.
- WiX 3.x is installed at C:\Program Files (x86)\WiX Toolset v3.14\bin -- add to PATH to build .exe installers
- .exe installer format is blocked by Windows Smart App Control; use app-image (default) for distribution

Swagger UI available at `https://localhost:8080/swagger-ui.html` during development.

## Architecture

### Module Layout (Maven multi-module)

```
kavach-backend/   -- Spring Boot 4.x, Java 25
kavach-frontend/  -- React 19 + TypeScript + Vite
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

### TOTP Reveal Flow

1. User sets up TOTP during the setup wizard: `POST /api/totp/setup` returns a QR code URI; `POST /api/totp/confirm` validates the first code and stores the encrypted TOTP secret on `vault_user.totp_secret_encrypted`.
2. `POST /api/credentials/{id}/reveal` — user submits the current 6-digit TOTP code from their authenticator app; `TotpService.isValidCode()` decrypts the stored secret and validates via the samstevens TOTP library (30-second window); on success, decrypts and returns the password.
3. Frontend auto-vanishes the password after 60s; clipboard auto-clears after 30s.

### Audit Logging

Uses Spring's `ApplicationEventPublisher` (Observer pattern). Services publish events (`CredentialAccessedEvent`, `CredentialCreatedEvent`, etc.); `AuditLogListener` writes to `audit_log` asynchronously. Never inline audit writes in service methods.

### Frontend State

```typescript
// Zustand store - auth/lock state and UI preference only
{ status: 'loading' | 'locked' | 'unlocked' | 'setup', lastActivity: number, colorMode: 'light' | 'dark' }
```

TanStack Query handles all API server state (caching, loading, error, background refetch). React Hook Form + Zod for forms, with matching Bean Validation on the backend.

## Key Patterns & Conventions

### Backend

| Pattern | Application |
|---------|-------------|
| Repository | All DB access via Spring Data JPA repos |
| Service Layer | Business logic only in `@Service`; controllers delegate immediately |
| Facade | `EncryptionService` hides raw crypto APIs |
| Strategy | `NotificationStrategy` interface → `EmailNotificationStrategy` (extensible for future notification types) |
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

- OWASP Dependency-Check is NOT yet in the Maven build (no pom contains it). Planned as a follow-up, gated to fail on CVSS >= 7.
- Secrets (`byte[]`/`char[]`) must be zeroed after use — verify `SessionKeyStore.clear()` is called on every exit path (logout, lock, shutdown hook).
- TOTP validation uses the samstevens library via `TotpService.isValidCode()` — never compare TOTP codes with `String.equals()`.
- DEK re-encryption on master password change must be a single `@Transactional` method covering all credentials.
- Security headers set by `SecurityHeadersFilter`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `CSP: default-src 'self'; style-src 'self' 'nonce-<per-request>'; connect-src 'self' https://api.github.com`
  (the GitHub entry is for the update check only; never add `unsafe-eval`/`unsafe-inline`).
  The style nonce exists because Radix dialogs lock scrolling via react-remove-scroll-bar,
  which injects a `<style>` tag at runtime. `SpaController` serves index.html itself and
  replaces `__CSP_NONCE__` in its `csp-nonce` meta tag; `src/cspNonce.ts` hands it to
  `get-nonce`. Scripts get no nonce (`'self'` only). Zod runs with
  `jitless` (`src/zodConfig.ts`) so its eval probe does not trip the CSP.
- Dependabot owns dependency versions declared in a manifest. It does NOT own Spring Boot
  BOM property overrides in the root `pom.xml` - those are maintained by hand. Read the
  comment above any such override before touching it, and re-check every one when upgrading
  Spring Boot. (The old `commons-lang3` pin was removed because the Boot 4.1.3 BOM manages
  3.20.0.)

## Testing Rule

Every phase ships with its tests. No deferred testing. Backend: JUnit 5 + Mockito + MockMvc. Frontend: Vitest + Testing Library.

## Completed Features

Current release: **v1.4.0**.

### Released in v1.0.0 - v1.1.0

- **Distribution Landing Page** -- GitHub Pages site at docs/index.html, plain HTML + Tailwind CDN. Released in v1.0.0.
- **Backup to User-Chosen Location** -- BackupService + BackupController + Settings modal. Destination stored in ~/.kavach/backup-destination.txt. Released in v1.1.0.
- **Localhost HTTPS** -- Self-signed PKCS12 cert generated on first launch via Bouncy Castle, stored in ~/.kavach/kavach.p12. Password unique per install (timestamp-based) stored in ~/.kavach/tls.key. SslPropertyCleaner wipes SSL system properties after Tomcat starts. Released in v1.1.0.

### Released in v1.2.0

- **Credential tags** -- `TagInput.tsx`, filter bar on the dashboard.
- **Secure notes** -- note-type credentials with their own add/edit screens.
- **Favourites** -- star toggle, `PUT /api/credentials/{id}/favourite`.
- **Password generator presets** -- `PasswordGenerator.tsx` + `usePasswordGenerator`.
- **Password strength meter** -- `PasswordStrengthMeter.tsx`.
- **Breach check** -- `HibpService` (HaveIBeenPwned k-anonymity range API).
- **Password expiry reminders** -- `ExpiryBanner.tsx` + `useExpiryCheck`.
- **Light/dark mode toggle**.
- **Update notification** -- `useUpdateCheck.ts`. Shipped as an automatic banner on load,
  but the CSP blocked the request so it never worked in the packaged app. Replaced
  2026-11-24 by a manual "Check for updates" button in Settings (`UpdateCheck.tsx`):
  local-first, so GitHub is contacted only on click. Notification only, no auto-install.
- **TOTP reveal flow** -- replaced the email OTP reveal with an authenticator app. See
  the TOTP Reveal Flow section above.

### Released in v1.3.0

- **CSV import** -- `CsvImportService` + `POST /api/credentials/import-csv`. Chrome,
  LastPass and Bitwarden formats.
- **Keyboard shortcuts** -- Ctrl+K search, N new credential, Escape clear search.
- **Light mode contrast fix** -- all five themes shift their palette darker in light mode.
- **Theme-aware note icons** and consistent Add/Edit form headers.
- **Frontend tests wired into the Maven build** (`vitest --run`).

### Released in v1.3.1

Maintenance and security release; no new features.

- **Liquibase analytics disabled** -- Liquibase OSS >= 4.30 phoned home on every
  startup by default. Static block in `KavachApplication`, guarded by
  `LiquibaseAnalyticsDisabledTest`.
- **Spring Boot 4.1.3 + Java 25** -- Boot 3.5 / Spring 6.2 left OSS support on
  2026-06-30. Liquibase 5 (FSL-1.1-ALv2, see `THIRD-PARTY-NOTICES.md`), Jackson 3,
  Hibernate 7, Tomcat 11. The bundled runtime is an explicit 34-module jlink image.
- **Version drift fixed** -- v1.3.0 shipped with package.json and the child-pom parents
  at 1.2.0, so its update banner always offered 1.3.0. `VersionConsistencyTest` now
  fails the build if the five version spots disagree.
- **Frontend** -- Tailwind 4 (compat mode), React 19.3, Vite 8, Vitest 5; Node 24 in the
  Maven build; all npm advisories cleared.
- **CI and releases** -- `.github/workflows/ci.yml` builds and tests every PR;
  `.github/workflows/release.yml` drafts a release from a `vX.Y.Z` tag.

### Released in v1.3.2

Maintenance release; no new features.

- **Spring Boot 4.2.0** -- Spring Framework 7.1, Spring Security 7.2, Logback 1.6.
  Smoke-tested against a copy of an existing vault: Liquibase changelog unchanged.
- **Bundled runtime Temurin 25.0.5.1** -- the first release built with setup-java
  `check-latest`; v1.3.1 had shipped 25.0.5 from the runner's preinstalled JDK. Raised by
  the Java patch reminder (issue #37).

### Released in v1.4.0

The UI redesign ("D. Combo": approved canvas https://claude.ai/artifact/DandMh9VcbAAHo1xnC659M,
local source `docs/notes/redesign-canvas/project/`, plan `docs/notes/redesign-plan.md`).

- **Design tokens** -- one light/dark token sheet with one gold accent (navy secondary),
  IBM Plex Sans/Mono + Fraunces bundled locally (#42, #52). See docs/ARCHITECTURE.md s8.
- **Brand** -- flat SVG shield mark, favicon, `Kavach.exe` icon (#44, #45); sidebar
  wordmark with "Personal Password Manager"; gold banner on the lock screen and setup
  wizard (#54). Images generated by `scripts/icons/generate.mjs`.
- **Sidebar shell + status bar** (#46); forms, Audit log and Health restyled, Delete moved
  to the Edit screens (#48); Settings on accessible dialogs (#50).
- **Dashboard** -- summary strip, favourites strip, filter chips, rows with website /
  strength / tag chips and password age; per-row strength comes from the Health endpoint
  (docs/ARCHITECTURE.md s9) (#51).
- **New item / Edit as dialogs** over the current screen, route-backed (`lib/itemRoutes.ts`);
  "+ New item" in the sidebar, `N` on every screen (#53).
- **Password age = password changes only** -- `credential.password_changed_at`
  (changeset 012), set only when the password itself changes (#47).
- **Clipboard clear fixed** -- the 30 s clear never worked (Firefox needs a user gesture,
  Chromium needs focus); now retried on the next click/key/focus in Kavach (#51).
- **CSP style nonce** for the Radix dialog scroll lock (#49).

Known gap: the setup wizard was not checked visually before release (covered by
SetupWizard.test); check it with a throwaway DB
(`--spring.datasource.url=jdbc:sqlite:C:/temp/x.db`).

## Planned Features (in priority order)

### UI conventions (from the v1.4.0 redesign)
Details in docs/ARCHITECTURE.md sections 8-9.
- One token sheet, `src/index.css`; light + dark, ONE gold accent (navy secondary);
  red/amber/green only for strength/problems. New tokens also go in `components/ui/cn.ts`.
- Item dialogs are route-backed (`lib/itemRoutes.ts`): links into /add, /edit/:id... pass
  `state: itemLinkState(location)`; App renders the screens at the background location.
- Brand images come from `scripts/icons/generate.mjs` (sources: the SVG marks and
  `kavach-banner.png`); never hand-edit the outputs.
- The gold banner in the sidebar corner was tried and deferred by the owner (trial image
  and compose.py in docs/notes/brand-preview/).
- Dev: open http://localhost:5173 typed in full (Firefox autocompletes https and fails
  with SSL_ERROR_RX_RECORD_TOO_LONG); port 8080 serves the last Maven-packaged frontend.
- Handoffs that add an npm dependency must say to install with Maven's bundled npm, or
  `npm ci` rejects the lockfile (in kavach-frontend, Bash:
  `PATH="$PWD/node:$PATH" node node/node_modules/npm/bin/npm-cli.js install`).

### 1. Encrypted documents (PDFs and images) -- NEXT, design not started
Owner request 2026-11-25: store documents in the vault in encrypted form and render them
inside Kavach; mostly PDFs and image files. Large feature: start with the
software-architect agent. Open questions for the design: storage (BLOBs in kavach.db vs
encrypted files beside it, and the effect on backups), size limit, per-document DEK like
credentials, rendering without writing plaintext to disk or weakening the CSP (pdf.js
worker, blob: URLs), whether opening a document needs TOTP like a password reveal, and
audit events.

### 2. Code signing for Kavach.exe -- required before sharing the download
Windows Smart App Control blocks the unsigned jpackage launcher whenever the release zip
is browser-downloaded (Mark-of-the-Web; CodeIntegrity events 3077/3033). Locally built
copies run. The bundled Java DLLs are already Eclipse-signed; only `Kavach.exe` needs it,
as a step in `release.yml` after jpackage. Options: Azure Artifact Signing (~$9.99/month,
individuals in US/Canada, publisher = own name) or SignPath Foundation (free for OSS,
publisher "SignPath Foundation", approval not guaranteed). Deferred while the owner is the
only user; owner has not yet said whether they are in the US/Canada.

### 3. OWASP Dependency-Check in CI
Dependabot cannot see versions managed by the Spring Boot BOM (Spring, Tomcat, Jackson,
Logback) -- they carried ~40 open advisories with zero alerts until 2026-11-23. Add
`dependency-check-maven` as a CI job (NVD API key as a secret, fail on CVSS >= 7, tracked
suppression file). Until then, check with OSV against `mvn dependency:tree`.

### 4. Possibly dead email-OTP code
`otp/` backend package, OtpService/OtpController, `OtpModal.tsx`, `useOtpFlow.ts` still
exist alongside `totp/` since the reveal flow moved to TOTP in v1.2.0, carrying an SMTP
dependency. Check reachability, then remove in its own PR.

### 5. Browser Extension
Autofill in browser login forms. Treated as v2.0 scope: roughly 2-3 weeks standalone, and
closer to a separate project than a feature.

Shape: a content script detects login forms and shows a credential picker, filling only on
an explicit click -- never auto-filling without confirmation. A background service worker
fetches credentials filtered by domain match.

Four problems to solve before any of that matters:
1. **Auth.** The JWT is `httpOnly` + `SameSite=Strict`, so an extension background worker
   cannot send it. Needs a dedicated long-lived extension API token and a backend endpoint
   to register and issue one.
2. **Self-signed cert.** `fetch()` from an extension to the local HTTPS port is rejected
   unless the user has trusted the cert. May require a separate HTTP-only local endpoint
   for extension use.
3. **Form detection.** SPAs, dynamically rendered forms and iframes make reliable
   detection genuinely hard.
4. **Publishing.** Chrome Web Store ($5 one-off), Firefox Add-ons (free); both review.

### 6. macOS Build
jpackage produces a `.dmg` by default. No Mac needed: GitHub-hosted macOS runners are free
for this public repo, so add a `macos-latest` job to `release.yml` and attach
`Kavach-vX.Y.Z-macos.dmg`. Code signing via Apple Developer ID certificate is required to
avoid Gatekeeper blocking.

### 7. Linux Build
jpackage produces a `.deb` (requires `dpkg-dev`) or `.rpm` (requires `rpm-build`). As with
macOS, add an `ubuntu-latest` job to `release.yml` and attach the package.

## Dropped

- **Automatic update check on load** -- replaced 2026-11-24 (#43) by a manual "Check for
  updates" button in Settings. The banner never worked in the packaged app (CSP blocked
  it), and enabling it would have contacted GitHub on every unlock; local-first wins.
- **Other fixes for the Radix dialog scroll-lock CSP error** -- rejected 2026-11-24 in
  favour of the per-request style nonce (#49): `style-src 'unsafe-inline'` (allows any
  injected style); static CSS for `body[data-scroll-locked]` plus
  `scrollbar-gutter: stable` (restores the lock but the library still tries to inject, so
  the console error stays); replacing Radix Dialog with native `<dialog>` (large rewrite,
  harder to test in jsdom).

- **Per-credential TOTP storage** -- dropped 2026-05-30. Storing a credential's password
  and its TOTP secret in the same vault defeats the point of the second factor.
- **Five accent themes** (amber/sky/emerald/rose/violet) -- dropped 2026-11-24 with the UI
  redesign in favour of light/dark plus one gold accent taken from the logo. Fewer themes
  are what make the design look finished.
- **Liquibase 4 pin or a switch to Flyway** -- rejected 2026-11-23. Liquibase 5 is
  FSL-1.1-ALv2 (source-available; each release becomes Apache 2.0 after two years). Kavach
  is free and not a competing product, so FSL only requires the notice in
  `THIRD-PARTY-NOTICES.md`; 4.x gets no fixes and Flyway would mean rewriting migrations.
