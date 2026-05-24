# Kavach - Encryption Design

This document explains how Kavach encrypts and decrypts credentials, why a two-level
key hierarchy is used, and what happens during a master password change.

---

## The Problem: Why Not Encrypt Everything With the Master Key Directly?

Imagine all 50 credentials are encrypted directly with your master key.
You change your master password. Now you must re-encrypt all 50 passwords with the
new key. This is slow, and if anything fails halfway (power cut, crash), some
passwords are encrypted with the old key and some with the new one - the vault is
in a corrupt, unrecoverable state.

The two-level key hierarchy solves this. The master key never touches the password
directly. It only encrypts a small intermediate key called the DEK (Data Encryption
Key). Changing the master password means re-encrypting the DEKs (tiny, fast) - not
the passwords themselves.

---

## Algorithms Used

| Operation         | Algorithm                        | Why                                              |
|-------------------|----------------------------------|--------------------------------------------------|
| Key derivation    | PBKDF2WithHmacSHA256, 600k iters | Makes brute-force of master password expensive   |
| Encryption        | AES-256-GCM                      | Authenticated encryption - detects tampering     |
| OTP comparison    | MessageDigest.isEqual()          | Constant-time - prevents timing attacks          |
| Password hashing  | BCrypt                           | Slow hash suitable for login credential storage  |

**Why AES-GCM and not AES-CBC?**
AES-GCM provides authenticated encryption. If anyone flips a bit in an encrypted
field on disk (accidental corruption or deliberate tampering), decryption throws
an AEADBadTagException instead of silently returning garbage. The vault detects
tampered data before showing it to you.

---

## Key Hierarchy

```
Master Password (char[])
    |
    | PBKDF2WithHmacSHA256
    | 600,000 iterations
    | random salt (stored in vault_user.pbkdf2_salt)
    v
Master Key - byte[32] (RAM only, never written to disk)
    |
    | AES-256-GCM + random IV1
    v
dek_encrypted (stored in credential.dek_encrypted)


DEK - byte[32] (RAM only, ephemeral - zeroed after each use)
    |
    | AES-256-GCM + random IV2
    v
encrypted_password (stored in credential.encrypted_password)


Plaintext Password (char[], RAM only, shown for 60s then zeroed)
```

The master key and DEK are never written to disk. They exist in RAM only during
active operations and are explicitly zeroed (not just garbage-collected) when done.

---

## Concrete Example: Storing a "Gmail" Credential

**Input:** master password = "correct-horse-battery", password to store = "myGmailPass123"

### Step 1 - Derive the Master Key (happens on every login)

```
Input  : "correct-horse-battery" + pbkdf2_salt (from vault_user table)
Process: PBKDF2WithHmacSHA256, 600,000 iterations
Output : Master Key = [a3 f1 9c 02 ... 7e b4]  (32 bytes, stored in SessionKeyStore)
```

The salt is different for every Kavach installation. Two users with the same master
password will produce different master keys because their salts differ.

### Step 2 - Generate a random DEK for this credential

```
Input  : SecureRandom
Output : DEK = [55 d2 8a 11 ... c3 09]  (32 bytes, unique per credential)
```

Every credential gets its own unique DEK. Even if two credentials happen to have the
same password, their ciphertexts will be completely different because the DEKs differ.

### Step 3 - Encrypt the password with the DEK

```
Input  : "myGmailPass123" + DEK + random IV2
Process: AES-256-GCM
Output : encrypted_password = [e3 91 5c ... | b7 4f a1 ... | auth-tag(16)]
                               ^-- IV2(12)    ^-- ciphertext   ^-- GCM tag
```

IV2 is prepended to the ciphertext inside the blob. There is no separate IV column.

### Step 4 - Encrypt the DEK with the Master Key

```
Input  : DEK + Master Key + random IV1
Process: AES-256-GCM
Output : dek_encrypted = [12 7b 44 ... | 9a 03 cc ... | auth-tag(16)]
                          ^-- IV1(12)    ^-- ciphertext   ^-- GCM tag
```

IV1 is prepended to the ciphertext inside the blob, same pattern as step 3.

### What is written to the database

```
credential row:
  purpose            = "Gmail"
  username           = "john@gmail.com"
  encrypted_password = [IV2(12) | ciphertext | tag(16)]   -- self-contained blob
  dek_encrypted      = [IV1(12) | ciphertext | tag(16)]   -- self-contained blob
```

The plaintext password and the raw DEK are never written to disk.
They are zeroed in RAM as soon as the encrypt operation completes.

---

## Retrieving a Password (the Reveal Flow)

The process is the exact reverse of storage:

```
1. OTP validated (see ARCHITECTURE.md - Credential Reveal Flow)

2. Read dek_encrypted blob from DB (IV1 is the first 12 bytes of the blob)
   Decrypt with Master Key  ->  DEK  (back in RAM)

3. Read encrypted_password blob from DB (IV2 is the first 12 bytes of the blob)
   Decrypt with DEK         ->  "myGmailPass123"  (back in RAM)

4. Send plaintext to frontend
   - Displayed for 60 seconds, then auto-cleared from the DOM
   - Clipboard copy auto-clears after 30 seconds

5. Zero DEK bytes in RAM immediately after step 3
```

If decryption detects a tampered auth tag at any step, AEADBadTagException is thrown
and nothing is returned to the frontend.

---

## Master Password Change

This is where the two-level hierarchy proves its value.

**Scenario:** changing from "correct-horse-battery" to "new-super-secret-pass"

```
Old Master Key: [a3 f1 9c 02 ... 7e b4]   (derived from old password + old salt)
New Master Key: [f7 2a 04 d1 ... 89 3c]   (derived from new password + NEW salt)
```

A new salt is generated so that the new master key bears no mathematical relationship
to the old one, even if the password is similar.

**For each credential**, CredentialService does the following inside a single
@Transactional method:

```
1. Decrypt dek_encrypted with OLD Master Key  ->  DEK  (in RAM)
2. Re-encrypt DEK with NEW Master Key         ->  new dek_encrypted
3. Update credential row: set dek_encrypted = new value
4. Zero DEK bytes in RAM
```

**The encrypted_password column is never touched.**
The actual password bytes on disk do not change at all.

```
Before change:                        After change:
  encrypted_password = [b7 4f a1]      encrypted_password = [b7 4f a1]  <- unchanged
  dek_encrypted      = [9a 03 cc]      dek_encrypted      = [c2 88 f3]  <- new
```

**What if something fails mid-way?**
Because the entire operation runs inside @Transactional, any failure (crash, exception)
causes a full rollback. Every credential stays encrypted with the old key.
There is no partial migration state.

**After the re-encryption completes:**
- vault_user.master_password_hash is updated to the new BCrypt hash
- vault_user.pbkdf2_salt is updated to the new salt
- SessionKeyStore is cleared (master key zeroed)
- The user is forced to log in again with the new password

---

## What "Zeroing" Means and Why It Matters

Java Strings are immutable and interned - once created, a String containing a password
can linger in the heap for an unpredictable amount of time until the garbage collector
decides to collect it. During that window, a heap dump or memory scraper could extract it.

Kavach uses char[] and byte[] for all secrets instead of String. Arrays are mutable,
so the values can be overwritten with zeroes immediately after use:

```java
Arrays.fill(masterKey, (byte) 0);   // key bytes become 0x00 0x00 0x00 ...
Arrays.fill(password, '\0');        // char array becomes null chars
```

This does not guarantee the bytes cannot be read (the OS or JVM may have already
copied the memory page), but it closes the window significantly.

SessionKeyStore.clear() is called on every exit path:
- Normal logout
- Auto-lock after 10 minutes of inactivity
- JVM shutdown hook (catches SIGTERM / window close)

---

## Summary: What Is Stored Where

| Data                  | Where             | Form                          |
|-----------------------|-------------------|-------------------------------|
| Master password       | Nowhere           | Never stored                  |
| Master key            | RAM only          | byte[], zeroed on lock/logout |
| PBKDF2 salt           | vault_user table  | Plain bytes (not secret)      |
| BCrypt hash           | vault_user table  | For login verification only   |
| DEK                   | RAM only          | byte[], zeroed after each use |
| encrypted DEK         | credential table  | AES-256-GCM ciphertext        |
| Plaintext password    | RAM only          | char[], cleared after 60s     |
| Encrypted password    | credential table  | AES-256-GCM ciphertext        |
| SMTP credentials      | app_config table  | AES-256-GCM ciphertext        |
