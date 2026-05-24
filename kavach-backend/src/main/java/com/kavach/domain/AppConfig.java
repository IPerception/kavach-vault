package com.kavach.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Key-value store for encrypted application settings.
 *
 * Sensitive configuration (SMTP host, port, username, password) is stored here
 * encrypted with the master key, not in application.properties as plaintext.
 * Values are decrypted into memory when the vault is unlocked.
 *
 * Example keys: "smtp.host", "smtp.port", "smtp.username", "smtp.password"
 *
 * The key field is the primary key, so saving an existing key overwrites it.
 */
@Entity
@Table(name = "app_config")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppConfig {

    @Id
    @Column(name = "config_key", nullable = false)
    private String key;

    @Column(name = "value_encrypted", nullable = false)
    private byte[] valueEncrypted;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
