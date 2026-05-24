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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
public class AuthService {

    private final VaultUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final KeyDerivationService keyDerivationService;
    private final SessionKeyStore sessionKeyStore;
    private final ApplicationEventPublisher eventPublisher;
    private final CredentialRepository credentialRepository;
    private final EncryptionService encryptionService;

    public AuthService(VaultUserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       KeyDerivationService keyDerivationService,
                       SessionKeyStore sessionKeyStore,
                       ApplicationEventPublisher eventPublisher,
                       CredentialRepository credentialRepository,
                       EncryptionService encryptionService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.keyDerivationService = keyDerivationService;
        this.sessionKeyStore = sessionKeyStore;
        this.eventPublisher = eventPublisher;
        this.credentialRepository = credentialRepository;
        this.encryptionService = encryptionService;
    }

    public void register(RegisterRequest request) {
        if (userRepository.count() > 0) {
            throw new VaultAlreadyInitializedException();
        }
        byte[] salt = keyDerivationService.generateSalt();
        VaultUser user = VaultUser.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .masterPasswordHash(passwordEncoder.encode(request.getPassword()))
                .pbkdf2Salt(salt)
                .createdAt(LocalDateTime.now())
                .build();
        userRepository.save(user);
    }

    public VaultUser login(LoginRequest request, String ipAddress) {
        VaultUser user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getMasterPasswordHash())) {
            eventPublisher.publishEvent(new AuditEvent(user, AuditAction.LOGIN_FAILED, ipAddress));
            throw new InvalidCredentialsException();
        }

        byte[] keyBytes = keyDerivationService.deriveKey(request.getPassword(), user.getPbkdf2Salt());
        try {
            sessionKeyStore.storeKey(new SecretKeySpec(keyBytes, "AES"));
        } finally {
            Arrays.fill(keyBytes, (byte) 0);
        }

        eventPublisher.publishEvent(new AuditEvent(user, AuditAction.LOGIN, ipAddress));
        return user;
    }

    public void logout(String ipAddress) {
        sessionKeyStore.clear();
    }

    public boolean isVaultInitialized() {
        return userRepository.count() > 0;
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request, String username) {
        VaultUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getMasterPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        byte[] oldKeyBytes = keyDerivationService.deriveKey(request.getCurrentPassword(), user.getPbkdf2Salt());
        byte[] newSalt = keyDerivationService.generateSalt();
        byte[] newKeyBytes = keyDerivationService.deriveKey(request.getNewPassword(), newSalt);

        try {
            SecretKey oldMasterKey = new SecretKeySpec(oldKeyBytes, "AES");
            SecretKey newMasterKey = new SecretKeySpec(newKeyBytes, "AES");

            List<Credential> credentials = credentialRepository.findAllByUser(user);
            for (Credential credential : credentials) {
                byte[] dek = encryptionService.decrypt(credential.getDekEncrypted(), oldMasterKey);
                credential.setDekEncrypted(encryptionService.encrypt(dek, newMasterKey));
            }
            credentialRepository.saveAll(credentials);

            user.setMasterPasswordHash(passwordEncoder.encode(request.getNewPassword()));
            user.setPbkdf2Salt(newSalt);
            userRepository.save(user);

            sessionKeyStore.storeKey(newMasterKey);
        } finally {
            Arrays.fill(oldKeyBytes, (byte) 0);
            Arrays.fill(newKeyBytes, (byte) 0);
        }
    }
}
