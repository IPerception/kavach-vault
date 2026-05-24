# Kavach — Architecture Diagrams

> **Kavach** (कवच) — Sanskrit for *shield* or *armour*.

---

## 1. System Component Overview

```mermaid
graph TB
    subgraph Browser["Browser (localhost:8080)"]
        direction TB
        React["React 18 + TypeScript"]
        Zustand["Zustand\nAuth / Lock State"]
        RQ["TanStack Query\nServer State & Caching"]
        RHF["React Hook Form + Zod\nInput Validation"]
    end

    subgraph SpringBoot["Spring Boot Backend (localhost:8080)"]
        direction TB
        SC["Spring Security Filter Chain"]

        subgraph Controllers["API Layer"]
            AC["AuthController"]
            CC["CredentialController"]
            ALC["AuditLogController"]
        end

        subgraph Services["Service Layer"]
            AS["AuthService"]
            CS["CredentialService"]
            OS["OtpService"]
            NS["NotificationStrategy\n(Email / TOTP)"]
        end

        subgraph Crypto["Encryption Engine"]
            SKS["SessionKeyStore\nMaster Key in memory"]
            ES["EncryptionService\nAES-256-GCM Facade"]
            KDS["KeyDerivationService\nPBKDF2WithHmacSHA256"]
        end

        AuditPub["ApplicationEventPublisher\nAudit Observer"]
        MapStruct["MapStruct Mappers\nEntity ↔ DTO"]
    end

    subgraph Storage["Local Storage (on disk)"]
        SQLite["SQLite — kavach.db\nvault_user · credential\naudit_log · app_config"]
        Backups["Auto-backups\nkavach.db.backup-{date}\n(last 5 kept)"]
    end

    SMTP["SMTP Server\n(External)"]

    React <-->|httpOnly JWT cookie| SC
    SC --> Controllers
    Controllers --> Services
    Controllers --> MapStruct
    Services --> Crypto
    Services --> AuditPub
    Services --> SQLite
    OS --> NS
    NS -->|OTP email| SMTP
    AuditPub -->|audit_log INSERT| SQLite
    SQLite -.->|startup backup| Backups
```

---

## 2. Authentication & Session Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant SEC as Spring Security
    participant Auth as AuthService
    participant KDS as KeyDerivationService
    participant SKS as SessionKeyStore
    participant DB as SQLite

    alt First Launch (no vault_user row)
        FE->>User: Show Setup Wizard
        User->>FE: Master password + email + SMTP
        FE->>Auth: POST /api/auth/setup
        Auth->>KDS: PBKDF2(password, newSalt, 600k iterations)
        KDS-->>Auth: Master Key
        Auth->>DB: INSERT vault_user (hash, salt, email)
        Auth->>DB: INSERT app_config (SMTP, encrypted with Master Key)
        Auth-->>FE: 201 Created
    end

    User->>FE: Enter master password
    FE->>SEC: POST /api/auth/login {password}
    SEC->>Auth: forward
    Auth->>DB: SELECT vault_user (hash, salt)
    Auth->>KDS: PBKDF2(password, salt, 600k iterations)
    KDS-->>Auth: Master Key (byte[])
    Auth->>Auth: Verify hash — constant-time compare

    alt Invalid password
        Auth->>Auth: Increment fail counter (Bucket4j)
        Auth-->>FE: 401 Unauthorized
        Note over Auth: After 5 failures → 15-min lockout
    end

    Auth->>SKS: storeKey(masterKey)
    Auth->>Auth: Issue JWT (HS256, 10 min, httpOnly + SameSite=Strict cookie)
    Auth-->>FE: 200 OK + Set-Cookie: jwt
    FE->>FE: Zustand: status = unlocked
    Note over FE: InactivityWatcher starts 10-min countdown

    alt User idle 10 min
        FE->>SEC: POST /api/auth/logout
        SEC->>Auth: forward
        Auth->>SKS: clear() — zeros byte[], nulls reference
        Auth-->>FE: 200 OK + Clear-Cookie
        FE->>FE: Zustand: status = locked
    end
```

---

## 3. Credential Reveal Flow (OTP)

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant API as CredentialController
    participant OS as OtpService
    participant ES as EncryptionService
    participant SKS as SessionKeyStore
    participant Pub as EventPublisher
    participant Mail as SMTP
    participant DB as SQLite

    User->>FE: Click "Reveal Password"
    FE->>API: POST /api/credentials/{id}/request-otp
    API->>OS: requestOtp(credentialId, userId)

    alt Too many OTP requests (>3 per 15 min)
        OS-->>API: TooManyRequestsException
        API-->>FE: 429 Too Many Requests
    end

    OS->>OS: OtpFactory — SecureRandom 6-digit code
    OS->>OS: Store OtpEntry {code, expiry=+5min, attempts=0}
    OS->>Mail: Send OTP email
    API-->>FE: 200 OK

    FE->>FE: Show OtpModal (5-min countdown timer)
    User->>FE: Enter OTP code
    FE->>API: POST /api/credentials/{id}/reveal {otp}
    API->>OS: validateOtp(credentialId, otp)
    OS->>OS: MessageDigest.isEqual() — constant-time compare

    alt Invalid or expired OTP
        OS-->>API: InvalidOtpException
        API-->>FE: 400 Bad Request (ProblemDetail)
    end

    OS->>OS: Delete OtpEntry — single use
    API->>DB: SELECT credential (encrypted_password, dek_encrypted, iv, salt)
    API->>SKS: getKey() → Master Key
    API->>ES: decrypt(dek_encrypted, masterKey, iv)
    ES-->>API: DEK (byte[])
    API->>ES: decrypt(encrypted_password, DEK, iv)
    ES-->>API: Plaintext password (char[])
    API->>Pub: publish(CredentialAccessedEvent — VIEW)
    Pub->>DB: INSERT audit_log (async listener)
    API-->>FE: 200 OK {password}

    FE->>FE: Display password (60s auto-vanish countdown)
    Note over FE: ClipboardCopy auto-clears after 30s
    FE->>FE: Auto-clear password from DOM after 60s
```

---

## 4. Encryption Key Hierarchy

```mermaid
flowchart TD
    MP(["Master Password\nchar[]"])
    SALT(["PBKDF2 Salt\nrandom · stored in vault_user"])
    KDS["KeyDerivationService\nPBKDF2WithHmacSHA256\n600,000 iterations"]
    MK(["Master Key\nbyte[] — SessionKeyStore only\nzeroed on logout / lock"])

    DEK_ENC(["Encrypted DEK\nstored in credential.dek_encrypted"])
    IV1(["IV₁\nstored in credential"])
    ES1["EncryptionService\nAES-256-GCM\ndecrypt DEK"]
    DEK(["Per-Credential DEK\nbyte[] — ephemeral\nzeroed after use"])

    PW_ENC(["Encrypted Password\nstored in credential.encrypted_password"])
    IV2(["IV₂\nstored in credential"])
    ES2["EncryptionService\nAES-256-GCM\ndecrypt password"]
    PW(["Plaintext Password\nchar[] — ephemeral\nauto-vanish 60s"])

    MP --> KDS
    SALT --> KDS
    KDS --> MK

    MK --> ES1
    DEK_ENC --> ES1
    IV1 --> ES1
    ES1 --> DEK

    DEK --> ES2
    PW_ENC --> ES2
    IV2 --> ES2
    ES2 --> PW
```

---

## 5. Spring Security Filter Chain

```mermaid
flowchart LR
    REQ(["Incoming\nRequest"])

    F1["SecurityHeadersFilter\nX-Frame-Options: DENY\nX-Content-Type-Options: nosniff\nCSP: default-src 'self'"]
    F2["RateLimitFilter\nBucket4j\nlogin + OTP endpoints"]
    F3["JwtAuthFilter\nvalidate httpOnly cookie\nreject expired tokens"]

    CHECK{Route?}

    PUBLIC["/api/auth/**\n(public)"]
    PROTECTED["/api/**\n(protected)"]

    VALID{Valid JWT?}

    CTRL["Controller"]
    ERR(["401 Unauthorized\nProblemDetail"])

    REQ --> F1 --> F2 --> F3 --> CHECK
    CHECK -- public --> PUBLIC --> CTRL
    CHECK -- protected --> PROTECTED --> VALID
    VALID -- yes --> CTRL
    VALID -- no/expired --> ERR
```

---

## 6. Design Patterns — Interaction Map

```mermaid
flowchart TD
    subgraph Frontend["Frontend Patterns"]
        CP["Container / Presentational\nCredentialListContainer → CredentialListView"]
        CH["Custom Hooks\nuseInactivityWatcher\nuseOtpFlow · useClipboard"]
        CC2["Compound Components\nOtpModal.Trigger\nOtpModal.Content · OtpModal.Timer"]
        OBS_FE["Observer\nInactivityWatcher → Zustand store"]
    end

    subgraph Backend["Backend Patterns"]
        FAC["Facade\nEncryptionService\nhides KDS + AES-GCM primitives"]
        SL["Service Layer\nbusiness logic only in @Service\ncontrollers delegate immediately"]
        REP["Repository\nall DB access via\nSpring Data JPA repos"]
        FACT["Factory\nOtpFactory\ncreates OtpEntry objects"]
        STRAT["Strategy\nNotificationStrategy\nEmail → TOTP (Phase 10)"]
        OBS_BE["Observer (Spring Events)\nCredentialAccessedEvent\n→ AuditLogListener → DB"]
        COC["Chain of Responsibility\nSecurity Filter Chain\nSecurityHeaders → RateLimit → JWT"]
        BUILD["Builder\nLombok @Builder\nall DTOs + request/response"]
        NULL["Null Object\nAnonymousKavachSession\nsafe no-ops when unlocked"]
    end

    CP --> CH
    CH --> OBS_FE
    CP -->|TanStack Query| SL
    SL --> FAC
    SL --> FACT
    SL --> STRAT
    SL --> OBS_BE
    SL --> REP
    FAC --> REP
    COC --> SL
```

---

## 7. Data Flow — Add Credential

```mermaid
flowchart TD
    User(["User\nenters credential"])
    ZOD["Zod Schema\nfrontend validation"]
    API["POST /api/credentials\nBean Validation @Valid"]
    CS["CredentialService"]
    SKS["SessionKeyStore\ngetKey → Master Key"]
    ES["EncryptionService"]

    subgraph Encryption["Encryption Steps"]
        GEN_DEK["Generate random DEK\nSecureRandom"]
        ENC_PW["AES-256-GCM\nencrypt password\nwith DEK + IV₂"]
        ENC_DEK["AES-256-GCM\nencrypt DEK\nwith Master Key + IV₁"]
    end

    MAP["MapStruct\nDTO → Entity"]
    DB["SQLite\ncredential row"]
    PUB["EventPublisher\nCredentialCreatedEvent"]
    AUDIT["audit_log\nCREATE event"]

    User --> ZOD
    ZOD --> API
    API --> CS
    CS --> SKS
    SKS --> ES
    ES --> GEN_DEK
    GEN_DEK --> ENC_PW
    ENC_PW --> ENC_DEK
    ENC_DEK --> MAP
    MAP --> DB
    CS --> PUB
    PUB --> AUDIT
```
