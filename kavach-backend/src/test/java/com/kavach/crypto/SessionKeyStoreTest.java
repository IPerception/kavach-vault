package com.kavach.crypto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.lang.reflect.Field;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionKeyStoreTest {

    private SessionKeyStore store;

    @BeforeEach
    void setUp() {
        store = new SessionKeyStore();
    }

    @Test
    void getKey_afterStore_returnsEquivalentKey() throws NoSuchAlgorithmException {
        SecretKey key = generateKey();
        store.storeKey(key);
        assertThat(store.getKey()).isEqualTo(key);
    }

    @Test
    void storeKey_makesDefensiveCopy_mutatingOriginalDoesNotAffectStore() throws NoSuchAlgorithmException {
        SecretKey key = generateKey();
        byte[] originalEncoded = key.getEncoded().clone();
        store.storeKey(key);

        // The store should return the original bytes, unaffected by what happens outside
        SecretKey retrieved = store.getKey();
        assertThat(retrieved.getEncoded()).isEqualTo(originalEncoded);
    }

    @Test
    void getKey_returnsDefensiveCopy() throws NoSuchAlgorithmException {
        SecretKey key = generateKey();
        store.storeKey(key);

        SecretKey copy1 = store.getKey();
        SecretKey copy2 = store.getKey();
        // Different object references
        assertThat(copy1).isNotSameAs(copy2);
        // But same key material
        assertThat(copy1.getEncoded()).isEqualTo(copy2.getEncoded());
    }

    @Test
    void getKey_beforeStore_throwsIllegalStateException() {
        assertThatThrownBy(() -> store.getKey())
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void isUnlocked_returnsFalse_beforeStore() {
        assertThat(store.isUnlocked()).isFalse();
    }

    @Test
    void isUnlocked_returnsTrue_afterStore() throws NoSuchAlgorithmException {
        store.storeKey(generateKey());
        assertThat(store.isUnlocked()).isTrue();
    }

    @Test
    void isUnlocked_returnsFalse_afterClear() throws NoSuchAlgorithmException {
        store.storeKey(generateKey());
        store.clear();
        assertThat(store.isUnlocked()).isFalse();
    }

    @Test
    void getKey_afterClear_throwsIllegalStateException() throws NoSuchAlgorithmException {
        store.storeKey(generateKey());
        store.clear();
        assertThatThrownBy(() -> store.getKey())
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void clear_zerosInternalKeyBytes() throws Exception {
        SecretKey key = generateKey();
        store.storeKey(key);

        // Grab the internal byte[] via reflection before clearing
        Field rawField = SessionKeyStore.class.getDeclaredField("rawKey");
        rawField.setAccessible(true);
        byte[] internalBytes = (byte[]) rawField.get(store);

        store.clear();

        // After clear, the internal array must be all zeros
        byte[] expected = new byte[internalBytes.length];
        assertThat(internalBytes).isEqualTo(expected);
    }

    @Test
    void storeKey_rejectsNull() {
        assertThatThrownBy(() -> store.storeKey(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void storeKey_replacesExistingKey() throws NoSuchAlgorithmException {
        SecretKey first = generateKey();
        SecretKey second = generateKey();
        store.storeKey(first);
        store.storeKey(second);
        assertThat(store.getKey().getEncoded()).isEqualTo(second.getEncoded());
    }

    private SecretKey generateKey() throws NoSuchAlgorithmException {
        KeyGenerator kg = KeyGenerator.getInstance("AES");
        kg.init(256);
        return kg.generateKey();
    }
}
