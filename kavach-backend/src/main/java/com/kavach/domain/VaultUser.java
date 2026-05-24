package com.kavach.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * The single vault owner account. Kavach is a single-user app - this table
 * will always contain exactly one row after the setup wizard completes.
 *
 * masterPasswordHash: BCrypt hash used only to verify the login attempt.
 *   The plaintext master password is never stored.
 *
 * pbkdf2Salt: random 16-byte salt used in PBKDF2WithHmacSHA256 to derive
 *   the master encryption key. Stored here so the same key can be re-derived
 *   on every login. The salt is not secret - it only ensures that two vaults
 *   with the same master password produce different master keys.
 */
@Entity
@Table(name = "vault_user")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VaultUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "master_password_hash", nullable = false)
    private String masterPasswordHash;

    @Column(name = "pbkdf2_salt", nullable = false)
    private byte[] pbkdf2Salt;

    @Column(nullable = false)
    private String email;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "totp_secret_encrypted")
    private byte[] totpSecretEncrypted;
}
