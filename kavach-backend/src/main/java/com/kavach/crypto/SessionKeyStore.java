package com.kavach.crypto;

import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Arrays;

/**
 * Holds the derived master key in RAM for the duration of an unlocked session.
 * All access is synchronized — only one thread touches the key material at a time.
 *
 * The key is never written to disk. Calling clear() zeros the internal byte array
 * before releasing the reference, minimising the window where the key sits in heap
 * memory after logout.
 */
@Component
public class SessionKeyStore {

    // Package-private for reflection in tests
    byte[] rawKey = null;

    public synchronized void storeKey(SecretKey key) {
        if (key == null) throw new IllegalArgumentException("Key must not be null");
        if (rawKey != null) {
            Arrays.fill(rawKey, (byte) 0);
        }
        byte[] encoded = key.getEncoded();
        rawKey = Arrays.copyOf(encoded, encoded.length);
    }

    public synchronized SecretKey getKey() {
        if (rawKey == null) {
            throw new IllegalStateException("Vault is locked — no master key in memory");
        }
        byte[] copy = Arrays.copyOf(rawKey, rawKey.length);
        return new SecretKeySpec(copy, "AES");
    }

    public synchronized boolean isUnlocked() {
        return rawKey != null;
    }

    public synchronized void clear() {
        if (rawKey != null) {
            Arrays.fill(rawKey, (byte) 0);
            rawKey = null;
        }
    }
}
