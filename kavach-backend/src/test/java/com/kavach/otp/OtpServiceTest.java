package com.kavach.otp;

import com.kavach.crypto.EncryptionService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.domain.AuditAction;
import com.kavach.domain.Credential;
import com.kavach.domain.VaultUser;
import com.kavach.event.AuditEvent;
import com.kavach.exception.CredentialNotFoundException;
import com.kavach.exception.InvalidOtpException;
import com.kavach.repository.CredentialRepository;
import com.kavach.repository.VaultUserRepository;
import com.kavach.totp.TotpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock CredentialRepository credentialRepository;
    @Mock VaultUserRepository userRepository;
    @Mock TotpService totpService;
    @Mock EncryptionService encryptionService;
    @Mock SessionKeyStore sessionKeyStore;
    @Mock ApplicationEventPublisher eventPublisher;

    private OtpService otpService;
    private VaultUser testUser;
    private Credential testCredential;
    private SecretKey masterKey;

    private static final byte[] MASTER_KEY_BYTES = new byte[32];
    private static final byte[] DEK_BYTES;

    static {
        DEK_BYTES = new byte[32];
        Arrays.fill(DEK_BYTES, (byte) 1);
    }

    @BeforeEach
    void setUp() {
        otpService = new OtpService(credentialRepository, userRepository, totpService,
                encryptionService, sessionKeyStore, eventPublisher);

        testUser = VaultUser.builder()
                .id(1L).username("alice").email("alice@example.com")
                .masterPasswordHash("$2a$hashed").pbkdf2Salt(new byte[16])
                .createdAt(LocalDateTime.now()).build();

        masterKey = new SecretKeySpec(MASTER_KEY_BYTES, "AES");

        testCredential = Credential.builder()
                .id(1L).user(testUser).purpose("Gmail").username("alice")
                .encryptedPassword(new byte[60]).dekEncrypted(new byte[60])
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
    }

    @Test
    void reveal_validTotpCode_returnsDecryptedPassword() {
        SecretKey dekKey = new SecretKeySpec(DEK_BYTES, "AES");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(testCredential));
        when(totpService.isValidCode("123456", "alice")).thenReturn(true);
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.decrypt(any(byte[].class), eq(masterKey))).thenReturn(DEK_BYTES.clone());
        when(encryptionService.bytesToKey(any(byte[].class))).thenReturn(dekKey);
        when(encryptionService.decrypt(any(byte[].class), eq(dekKey))).thenReturn("secret".getBytes());

        String result = otpService.reveal(1L, "123456", "alice");

        assertThat(result).isEqualTo("secret");
    }

    @Test
    void reveal_invalidTotpCode_throwsInvalidOtpException() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(testCredential));
        when(totpService.isValidCode("000000", "alice")).thenReturn(false);

        assertThatThrownBy(() -> otpService.reveal(1L, "000000", "alice"))
                .isInstanceOf(InvalidOtpException.class);
    }

    @Test
    void reveal_credentialNotFound_throwsCredentialNotFoundException() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> otpService.reveal(99L, "123456", "alice"))
                .isInstanceOf(CredentialNotFoundException.class);
    }

    @Test
    void reveal_credentialBelongsToDifferentUser_throwsCredentialNotFoundException() {
        VaultUser otherUser = VaultUser.builder().id(2L).username("bob")
                .masterPasswordHash("h").pbkdf2Salt(new byte[16])
                .email("bob@example.com").createdAt(LocalDateTime.now()).build();
        Credential otherCredential = Credential.builder()
                .id(1L).user(otherUser).purpose("Gmail").username("bob")
                .encryptedPassword(new byte[60]).dekEncrypted(new byte[60])
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(otherCredential));

        assertThatThrownBy(() -> otpService.reveal(1L, "123456", "alice"))
                .isInstanceOf(CredentialNotFoundException.class);
    }

    @Test
    void reveal_validTotpCode_publishesViewAuditEvent() {
        SecretKey dekKey = new SecretKeySpec(DEK_BYTES, "AES");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(testCredential));
        when(totpService.isValidCode("123456", "alice")).thenReturn(true);
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.decrypt(any(byte[].class), eq(masterKey))).thenReturn(DEK_BYTES.clone());
        when(encryptionService.bytesToKey(any(byte[].class))).thenReturn(dekKey);
        when(encryptionService.decrypt(any(byte[].class), eq(dekKey))).thenReturn("secret".getBytes());

        otpService.reveal(1L, "123456", "alice");

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(captor.capture());
        AuditEvent event = (AuditEvent) captor.getValue();
        assertThat(event.action()).isEqualTo(AuditAction.VIEW);
        assertThat(event.user()).isEqualTo(testUser);
    }
}
