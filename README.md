# Kavach

**Kavach** (कवच, Sanskrit for *shield*) is a local-first personal password manager.
All data stays on your machine — no cloud, no external services except optional SMTP for OTP delivery.

---

## Running the app

**Option 1 — Native installer (recommended)**

Build the self-contained app-image (bundles its own JRE; no Java required on the machine).
Bundled runtime: Eclipse Temurin 25 (OpenJDK, free for personal and commercial use). The exact patch version is listed in each release's notes.

```bash
mvn clean install -P native-installer
```

Output: `dist/Kavach/Kavach.exe` (Windows). Launch it directly.

**Option 2 — JAR**

Requires Java 25 or later (older versions fail with `UnsupportedClassVersionError`).
The released Windows zip bundles its own runtime and needs no Java.

```bash
mvn clean package
java -jar kavach-backend/target/kavach.jar
```

Then open `https://localhost:8080` in your browser.

> **First launch only:** the browser will show a "Your connection is not private" warning because
> Kavach uses a self-signed certificate for localhost HTTPS. Click **Advanced** then
> **Proceed to localhost** to continue. You will not see this warning again in the same browser
> session, and the cert is reused on every subsequent startup.

**Option 3 — Dev mode**

```bash
# Terminal 1: backend
mvn spring-boot:run -pl kavach-backend

# Terminal 2: frontend (with hot reload, proxies /api to localhost:8080)
cd kavach-frontend && npm run dev
```

---

## Data storage

The database and config live in `~/.kavach/` (created on first launch):

| Platform | Path                              |
|----------|-----------------------------------|
| Windows  | `%USERPROFILE%\.kavach\kavach.db` |
| macOS    | `~/.kavach/kavach.db`             |
| Linux    | `~/.kavach/kavach.db`             |

The database is backed up automatically on each startup (last 5 copies kept).

### Backups

For a full backup of `~/.kavach` (database, WAL files, TLS keystore), close Kavach and run
`scripts/backup-kavach.ps1` in PowerShell. It writes a verified, timestamped zip to
`~\KavachBackups` by default and keeps the newest 10 (`-Destination` and `-Keep` override
this). It refuses to run while Kavach is open. The zip contains TLS key material, so keep
the destination private.

```powershell
.\scripts\backup-kavach.ps1 -Destination D:\Backups\Kavach -Keep 20
```

---

## First launch

On first launch, Kavach runs a one-time setup wizard:

1. Create your master username and password.
2. Scan the QR code with an authenticator app (Google Authenticator, Authy, or any TOTP app).
3. Confirm with the 6-digit code to open your vault.

The master password is never stored. It derives an AES-256 key that encrypts everything at rest.
If forgotten, vault data is unrecoverable.

---

## Build reference

| Task                        | Command                                 |
|-----------------------------|-----------------------------------------|
| Full build (jar + frontend) | `mvn clean package`                     |
| Native app-image            | `mvn clean install -P native-installer` |
| Backend tests               | `mvn test -pl kavach-backend`           |
| Frontend tests              | `cd kavach-frontend && npm test`        |
| Swagger UI (dev only)       | `https://localhost:8080/swagger-ui.html` |

---

## Security notes

- Passwords are encrypted with AES-256-GCM using a per-credential key (DEK).
- The master key lives in memory only and is zeroed on logout, lock, or shutdown.
- Revealing a saved password requires a TOTP code from your authenticator app.
- The vault auto-locks after 10 minutes of inactivity.

See `docs/ARCHITECTURE.md` and `docs/ENCRYPTION.md` for full technical details.

## Licence

Kavach is released under the MIT licence (see `LICENSE`). Bundled third-party components that are under other licences, including Liquibase, are listed in `THIRD-PARTY-NOTICES.md`.
