package com.kavach.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * One stored credential (e.g. "Gmail", "GitHub SSH key").
 *
 * No plaintext password is ever stored. The two binary blobs each embed their own IV:
 *
 *   encryptedPassword: [IV(12 bytes) | ciphertext | GCM tag(16 bytes)]
 *                       AES-256-GCM(plaintext, DEK)
 *   dekEncrypted:      [IV(12 bytes) | ciphertext | GCM tag(16 bytes)]
 *                       AES-256-GCM(DEK, masterKey)
 *
 * The UNIQUE constraint on (user_id, purpose) prevents duplicate entries for
 * the same purpose. Violation is caught as a 409 Conflict at the API layer.
 */
@Entity
@Table(
        name = "credential",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_credential_user_purpose",
                columnNames = {"user_id", "purpose"}
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Credential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private VaultUser user;

    @Column(nullable = false)
    private String purpose;

    @Column(nullable = false)
    private String username;

    @Column(name = "encrypted_password", nullable = false)
    private byte[] encryptedPassword;

    @Column(name = "dek_encrypted", nullable = false)
    private byte[] dekEncrypted;

    @Column
    private String url;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
