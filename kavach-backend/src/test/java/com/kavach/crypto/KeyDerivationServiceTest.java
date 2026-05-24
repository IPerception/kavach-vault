package com.kavach.crypto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KeyDerivationServiceTest {

    private KeyDerivationService kds;

    @BeforeEach
    void setUp() {
        kds = new KeyDerivationService();
    }

    @Test
    void derivedKey_is256Bits() {
        byte[] salt = kds.generateSalt();
        byte[] key = kds.deriveKey("password", salt);
        assertThat(key).hasSize(32); // 256 bits
    }

    @Test
    void deriveKey_isDeterministic() {
        byte[] salt = kds.generateSalt();
        byte[] key1 = kds.deriveKey("samePassword", salt);
        byte[] key2 = kds.deriveKey("samePassword", salt);
        assertThat(key1).isEqualTo(key2);
    }

    @Test
    void differentPasswords_produceDifferentKeys() {
        byte[] salt = kds.generateSalt();
        byte[] key1 = kds.deriveKey("password1", salt);
        byte[] key2 = kds.deriveKey("password2", salt);
        assertThat(key1).isNotEqualTo(key2);
    }

    @Test
    void differentSalts_produceDifferentKeys() {
        byte[] salt1 = kds.generateSalt();
        byte[] salt2 = kds.generateSalt();
        byte[] key1 = kds.deriveKey("samePassword", salt1);
        byte[] key2 = kds.deriveKey("samePassword", salt2);
        assertThat(key1).isNotEqualTo(key2);
    }

    @Test
    void generateSalt_is16Bytes() {
        byte[] salt = kds.generateSalt();
        assertThat(salt).hasSize(16); // 128-bit salt
    }

    @Test
    void generateSalt_isRandom() {
        byte[] salt1 = kds.generateSalt();
        byte[] salt2 = kds.generateSalt();
        assertThat(salt1).isNotEqualTo(salt2);
    }

    @Test
    void deriveKey_rejectsNullPassword() {
        byte[] salt = kds.generateSalt();
        assertThatThrownBy(() -> kds.deriveKey(null, salt))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deriveKey_rejectsNullSalt() {
        assertThatThrownBy(() -> kds.deriveKey("password", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deriveKey_rejectsEmptyPassword() {
        byte[] salt = kds.generateSalt();
        assertThatThrownBy(() -> kds.deriveKey("", salt))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
