package com.kavach.auth;

import com.kavach.crypto.EncryptionService;
import com.kavach.crypto.KeyDerivationService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.domain.AuditAction;
import com.kavach.domain.Credential;
import com.kavach.domain.VaultUser;
import com.kavach.dto.request.ChangePasswordRequest;
import com.kavach.dto.request.LoginRequest;
import com.kavach.dto.request.RegisterRequest;
import com.kavach.event.AuditEvent;
import com.kavach.exception.InvalidCredentialsException;
import com.kavach.exception.VaultAlreadyInitializedException;
import com.kavach.repository.CredentialRepository;
import com.kavach.repository.VaultUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.mockito.ArgumentCaptor;

import javax.crypto.spec.SecretKeySpec;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock VaultUserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock KeyDerivationService keyDerivationService;
    @Mock SessionKeyStore sessionKeyStore;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock CredentialRepository credentialRepository;
    @Mock EncryptionService encryptionService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder,
                keyDerivationService, sessionKeyStore, eventPublisher,
                credentialRepository, encryptionService);
    }

    @Test
    void register_success_savesUserWithHashedPassword() {
        when(userRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode("Password1!")).thenReturn("$2a$hashed");
        when(keyDerivationService.generateSalt()).thenReturn(new byte[16]);
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        authService.register(new RegisterRequest("alice", "alice@example.com", "Password1!"));

        verify(userRepository).save(argThat(u ->
                "alice".equals(u.getUsername()) &&
                "$2a$hashed".equals(u.getMasterPasswordHash())
        ));
    }

    @Test
    void register_whenVaultAlreadyExists_throwsAndNeverSaves() {
        when(userRepository.count()).thenReturn(1L);

        assertThatThrownBy(() ->
                authService.register(new RegisterRequest("alice", "alice@example.com", "Password1!")))
                .isInstanceOf(VaultAlreadyInitializedException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_success_storesMasterKeyInSessionKeyStore() {
        VaultUser user = buildUser();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1!", "$2a$hashed")).thenReturn(true);
        when(keyDerivationService.deriveKey("Password1!", new byte[16])).thenReturn(new byte[32]);

        authService.login(new LoginRequest("alice", "Password1!"), "127.0.0.1");

        verify(sessionKeyStore).storeKey(any());
    }

    @Test
    void login_success_publishesLoginAuditEvent() {
        VaultUser user = buildUser();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1!", "$2a$hashed")).thenReturn(true);
        when(keyDerivationService.deriveKey("Password1!", new byte[16])).thenReturn(new byte[32]);

        authService.login(new LoginRequest("alice", "Password1!"), "10.0.0.1");

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue()).isInstanceOf(AuditEvent.class);
        AuditEvent event = (AuditEvent) captor.getValue();
        assertThat(event.action()).isEqualTo(AuditAction.LOGIN);
        assertThat(event.ipAddress()).isEqualTo("10.0.0.1");
    }

    @Test
    void login_unknownUsername_throwsInvalidCredentials() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                authService.login(new LoginRequest("unknown", "pass"), "127.0.0.1"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentials() {
        VaultUser user = buildUser();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPass!", "$2a$hashed")).thenReturn(false);

        assertThatThrownBy(() ->
                authService.login(new LoginRequest("alice", "WrongPass!"), "127.0.0.1"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void logout_clearsSessionKeyStoreAndPublishesEvent() {
        authService.logout("127.0.0.1");
        verify(sessionKeyStore).clear();
    }

    @Test
    void isVaultInitialized_whenUserExists_returnsTrue() {
        when(userRepository.count()).thenReturn(1L);
        assertThat(authService.isVaultInitialized()).isTrue();
    }

    @Test
    void isVaultInitialized_whenNoUser_returnsFalse() {
        when(userRepository.count()).thenReturn(0L);
        assertThat(authService.isVaultInitialized()).isFalse();
    }

    @Test
    void changePassword_wrongCurrentPassword_throwsInvalidCredentials() {
        VaultUser user = buildUser();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPass!", "$2a$hashed")).thenReturn(false);

        assertThatThrownBy(() ->
                authService.changePassword(new ChangePasswordRequest("WrongPass!", "NewPass1!"), "alice"))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_success_reEncryptsDeksAndUpdatesUser() {
        VaultUser user = buildUser();
        Credential credential = Credential.builder()
                .id(1L).user(user).purpose("Gmail").username("alice")
                .encryptedPassword(new byte[60]).dekEncrypted(new byte[60])
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1!", "$2a$hashed")).thenReturn(true);
        when(keyDerivationService.deriveKey(eq("Password1!"), any())).thenReturn(new byte[32]);
        when(keyDerivationService.generateSalt()).thenReturn(new byte[16]);
        when(keyDerivationService.deriveKey(eq("NewPass1!"), any())).thenReturn(new byte[32]);
        when(credentialRepository.findAllByUser(user)).thenReturn(List.of(credential));
        when(encryptionService.decrypt(any(), any())).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(passwordEncoder.encode("NewPass1!")).thenReturn("$2a$newhashed");

        authService.changePassword(new ChangePasswordRequest("Password1!", "NewPass1!"), "alice");

        verify(credentialRepository).saveAll(any());
        verify(userRepository).save(argThat(u ->
                "$2a$newhashed".equals(u.getMasterPasswordHash())
        ));
        verify(sessionKeyStore).storeKey(any());
    }

    private VaultUser buildUser() {
        return VaultUser.builder()
                .id(1L).username("alice")
                .masterPasswordHash("$2a$hashed")
                .pbkdf2Salt(new byte[16])
                .email("alice@example.com")
                .createdAt(LocalDateTime.now())
                .build();
    }
}
