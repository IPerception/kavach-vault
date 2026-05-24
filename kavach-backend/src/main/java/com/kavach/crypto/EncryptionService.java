package com.kavach.crypto;

import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;

/**
 * AES-256-GCM facade.
 *
 * Blob format produced by encrypt(): [12-byte IV | ciphertext | 16-byte GCM auth tag]
 * The IV is randomly generated per call, so encrypt() is non-deterministic.
 * GCM authentication covers the ciphertext; any tampering causes decrypt() to throw CryptoException.
 */
@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;   // 96-bit IV recommended for GCM
    private static final int TAG_LENGTH_BITS = 128;  // 16-byte auth tag

    private final SecureRandom secureRandom = new SecureRandom();

    public byte[] generateDek() {
        try {
            KeyGenerator kg = KeyGenerator.getInstance("AES");
            kg.init(256);
            return kg.generateKey().getEncoded();
        } catch (NoSuchAlgorithmException e) {
            throw new CryptoException("DEK generation failed", e);
        }
    }

    public byte[] encrypt(byte[] plaintext, SecretKey key) {
        if (plaintext == null) throw new IllegalArgumentException("Plaintext must not be null");
        if (key == null) throw new IllegalArgumentException("Key must not be null");

        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] ciphertextWithTag = cipher.doFinal(plaintext);

            // Prepend IV to produce the final blob
            byte[] blob = new byte[IV_LENGTH_BYTES + ciphertextWithTag.length];
            System.arraycopy(iv, 0, blob, 0, IV_LENGTH_BYTES);
            System.arraycopy(ciphertextWithTag, 0, blob, IV_LENGTH_BYTES, ciphertextWithTag.length);
            return blob;
        } catch (Exception e) {
            throw new CryptoException("Encryption failed", e);
        }
    }

    public byte[] decrypt(byte[] blob, SecretKey key) {
        if (blob == null) throw new IllegalArgumentException("Cipher blob must not be null");
        if (blob.length < IV_LENGTH_BYTES) {
            throw new IllegalArgumentException("Cipher blob is too short to contain a valid IV");
        }
        if (key == null) throw new IllegalArgumentException("Key must not be null");

        try {
            byte[] iv = Arrays.copyOfRange(blob, 0, IV_LENGTH_BYTES);
            byte[] ciphertextWithTag = Arrays.copyOfRange(blob, IV_LENGTH_BYTES, blob.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return cipher.doFinal(ciphertextWithTag);
        } catch (javax.crypto.AEADBadTagException e) {
            throw new CryptoException("Decryption failed: authentication tag mismatch (wrong key or tampered data)", e);
        } catch (Exception e) {
            throw new CryptoException("Decryption failed", e);
        }
    }

    public SecretKey bytesToKey(byte[] keyBytes) {
        return new SecretKeySpec(keyBytes, "AES");
    }
}
