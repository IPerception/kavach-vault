package com.kavach.crypto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EncryptionServiceTest {

    private EncryptionService encryptionService;
    private SecretKey aesKey;

    @BeforeEach
    void setUp() throws NoSuchAlgorithmException {
        encryptionService = new EncryptionService();
        KeyGenerator kg = KeyGenerator.getInstance("AES");
        kg.init(256);
        aesKey = kg.generateKey();
    }

    @Test
    void encrypt_thenDecrypt_returnsOriginalPlaintext() {
        byte[] plaintext = "secret-password-123".getBytes();
        byte[] cipherBlob = encryptionService.encrypt(plaintext, aesKey);
        byte[] decrypted = encryptionService.decrypt(cipherBlob, aesKey);
        assertThat(decrypted).isEqualTo(plaintext);
    }

    @Test
    void encrypt_isNonDeterministic() {
        byte[] plaintext = "same-plaintext".getBytes();
        byte[] blob1 = encryptionService.encrypt(plaintext, aesKey);
        byte[] blob2 = encryptionService.encrypt(plaintext, aesKey);
        // Different IVs each call -> different ciphertext blobs
        assertThat(blob1).isNotEqualTo(blob2);
    }

    @Test
    void cipherBlob_containsIvPlusCiphertextPlusTag() {
        byte[] plaintext = "test".getBytes();
        byte[] blob = encryptionService.encrypt(plaintext, aesKey);
        // blob = 12 (IV) + plaintext.length + 16 (GCM tag)
        assertThat(blob).hasSize(12 + plaintext.length + 16);
    }

    @Test
    void decrypt_withWrongKey_throwsCryptoException() throws NoSuchAlgorithmException {
        byte[] plaintext = "secret".getBytes();
        byte[] blob = encryptionService.encrypt(plaintext, aesKey);

        KeyGenerator kg = KeyGenerator.getInstance("AES");
        kg.init(256);
        SecretKey wrongKey = kg.generateKey();

        assertThatThrownBy(() -> encryptionService.decrypt(blob, wrongKey))
                .isInstanceOf(CryptoException.class);
    }

    @Test
    void decrypt_withTamperedCiphertext_throwsCryptoException() {
        byte[] plaintext = "secret".getBytes();
        byte[] blob = encryptionService.encrypt(plaintext, aesKey);
        // Flip a byte in the ciphertext region (after the 12-byte IV)
        blob[15] ^= 0xFF;

        assertThatThrownBy(() -> encryptionService.decrypt(blob, aesKey))
                .isInstanceOf(CryptoException.class);
    }

    @Test
    void decrypt_withTamperedTag_throwsCryptoException() {
        byte[] plaintext = "secret".getBytes();
        byte[] blob = encryptionService.encrypt(plaintext, aesKey);
        // Corrupt the last byte (part of the GCM auth tag)
        blob[blob.length - 1] ^= 0xFF;

        assertThatThrownBy(() -> encryptionService.decrypt(blob, aesKey))
                .isInstanceOf(CryptoException.class);
    }

    @Test
    void encrypt_rejectsNullPlaintext() {
        assertThatThrownBy(() -> encryptionService.encrypt(null, aesKey))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void encrypt_rejectsNullKey() {
        assertThatThrownBy(() -> encryptionService.encrypt("data".getBytes(), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void decrypt_rejectsNullBlob() {
        assertThatThrownBy(() -> encryptionService.decrypt(null, aesKey))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void decrypt_rejectsBlobTooShort() {
        // Less than 12 bytes cannot contain a valid IV
        byte[] tooShort = new byte[11];
        assertThatThrownBy(() -> encryptionService.decrypt(tooShort, aesKey))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void encryptDek_thenDecryptDek_roundTrips() {
        // Verifies the DEK-wrapping use case: encrypt a random 32-byte DEK
        byte[] dek = new byte[32];
        new java.security.SecureRandom().nextBytes(dek);

        byte[] wrappedDek = encryptionService.encrypt(dek, aesKey);
        byte[] unwrappedDek = encryptionService.decrypt(wrappedDek, aesKey);
        assertThat(unwrappedDek).isEqualTo(dek);
    }
}
