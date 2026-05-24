package com.kavach.totp;

import com.kavach.crypto.EncryptionService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.domain.VaultUser;
import com.kavach.dto.TotpSetupResponse;
import com.kavach.exception.InvalidOtpException;
import com.kavach.repository.VaultUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TotpServiceTest {

    @Mock TotpProvider totpProvider;
    @Mock VaultUserRepository userRepository;
    @Mock EncryptionService encryptionService;
    @Mock SessionKeyStore sessionKeyStore;

    private TotpService totpService;
    private VaultUser testUser;
    private final SecretKey masterKey = new SecretKeySpec(new byte[32], "AES");

    @BeforeEach
    void setUp() {
        totpService = new TotpService(totpProvider, userRepository, encryptionService, sessionKeyStore);
        testUser = VaultUser.builder()
                .id(1L).username("alice").email("alice@example.com")
                .masterPasswordHash("$2a$hashed").pbkdf2Salt(new byte[16])
                .createdAt(LocalDateTime.now()).build();
    }

    @Test
    void initiateSetup_generatesSecretAndReturnsQrInfo() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(totpProvider.generateSecret()).thenReturn("TESTSECRET");
        when(totpProvider.getQrCodeUri("TESTSECRET", "alice@example.com", "Kavach"))
                .thenReturn("otpauth://totp/Kavach:alice@example.com?secret=TESTSECRET&issuer=Kavach");

        TotpSetupResponse response = totpService.initiateSetup("alice");

        assertThat(response.secret()).isEqualTo("TESTSECRET");
        assertThat(response.qrCodeUri()).contains("TESTSECRET");
    }

    @Test
    void confirmSetup_validCode_encryptsAndStoresSecret() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(totpProvider.generateSecret()).thenReturn("TESTSECRET");
        when(totpProvider.getQrCodeUri(any(), any(), any())).thenReturn("otpauth://...");
        when(totpProvider.isValidCode("TESTSECRET", "123456")).thenReturn(true);
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.encrypt(any(), eq(masterKey))).thenReturn(new byte[]{1, 2, 3});

        totpService.initiateSetup("alice");
        totpService.confirmSetup("123456", "alice");

        assertThat(testUser.getTotpSecretEncrypted()).isEqualTo(new byte[]{1, 2, 3});
        verify(userRepository).save(testUser);
    }

    @Test
    void confirmSetup_noPendingSetup_throwsInvalidOtpException() {
        assertThatThrownBy(() -> totpService.confirmSetup("123456", "alice"))
                .isInstanceOf(InvalidOtpException.class);
    }

    @Test
    void confirmSetup_wrongCode_throwsInvalidOtpException() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(totpProvider.generateSecret()).thenReturn("TESTSECRET");
        when(totpProvider.getQrCodeUri(any(), any(), any())).thenReturn("otpauth://...");
        when(totpProvider.isValidCode("TESTSECRET", "000000")).thenReturn(false);

        totpService.initiateSetup("alice");

        assertThatThrownBy(() -> totpService.confirmSetup("000000", "alice"))
                .isInstanceOf(InvalidOtpException.class);
    }

    @Test
    void confirmSetup_wrongCode_doesNotClearPendingSecret() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(totpProvider.generateSecret()).thenReturn("TESTSECRET");
        when(totpProvider.getQrCodeUri(any(), any(), any())).thenReturn("otpauth://...");
        when(totpProvider.isValidCode("TESTSECRET", "000000")).thenReturn(false);
        when(totpProvider.isValidCode("TESTSECRET", "123456")).thenReturn(true);
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[]{1});

        totpService.initiateSetup("alice");
        assertThatThrownBy(() -> totpService.confirmSetup("000000", "alice"))
                .isInstanceOf(InvalidOtpException.class);

        // Second attempt with correct code should still work (pending secret not cleared)
        totpService.confirmSetup("123456", "alice");
        verify(userRepository).save(testUser);
    }

    @Test
    void isValidCode_validCode_returnsTrue() {
        byte[] encryptedSecret = new byte[]{1, 2, 3};
        testUser.setTotpSecretEncrypted(encryptedSecret);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.decrypt(eq(encryptedSecret), eq(masterKey)))
                .thenReturn("TESTSECRET".getBytes());
        when(totpProvider.isValidCode("TESTSECRET", "123456")).thenReturn(true);

        assertThat(totpService.isValidCode("123456", "alice")).isTrue();
    }

    @Test
    void isValidCode_invalidCode_returnsFalse() {
        byte[] encryptedSecret = new byte[]{1, 2, 3};
        testUser.setTotpSecretEncrypted(encryptedSecret);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.decrypt(eq(encryptedSecret), eq(masterKey)))
                .thenReturn("TESTSECRET".getBytes());
        when(totpProvider.isValidCode("TESTSECRET", "000000")).thenReturn(false);

        assertThat(totpService.isValidCode("000000", "alice")).isFalse();
    }

    @Test
    void isValidCode_totpNotSetUp_returnsFalse() {
        testUser.setTotpSecretEncrypted(null);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));

        assertThat(totpService.isValidCode("123456", "alice")).isFalse();
        verifyNoInteractions(encryptionService, totpProvider);
    }
}
