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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Service
public class OtpService {

    private final CredentialRepository credentialRepository;
    private final VaultUserRepository userRepository;
    private final TotpService totpService;
    private final EncryptionService encryptionService;
    private final SessionKeyStore sessionKeyStore;
    private final ApplicationEventPublisher eventPublisher;

    public OtpService(CredentialRepository credentialRepository,
                      VaultUserRepository userRepository,
                      TotpService totpService,
                      EncryptionService encryptionService,
                      SessionKeyStore sessionKeyStore,
                      ApplicationEventPublisher eventPublisher) {
        this.credentialRepository = credentialRepository;
        this.userRepository = userRepository;
        this.totpService = totpService;
        this.encryptionService = encryptionService;
        this.sessionKeyStore = sessionKeyStore;
        this.eventPublisher = eventPublisher;
    }

    public String reveal(Long credentialId, String code, String username) {
        VaultUser user = loadUser(username);
        Credential credential = findOwnedCredential(credentialId, user);

        if (!totpService.isValidCode(code, username)) {
            throw new InvalidOtpException();
        }

        SecretKey masterKey = sessionKeyStore.getKey();
        byte[] dek = encryptionService.decrypt(credential.getDekEncrypted(), masterKey);
        SecretKey dekKey = encryptionService.bytesToKey(dek);
        byte[] plaintext = encryptionService.decrypt(credential.getEncryptedPassword(), dekKey);

        eventPublisher.publishEvent(new AuditEvent(user, AuditAction.VIEW, null));
        return new String(plaintext, StandardCharsets.UTF_8);
    }

    private VaultUser loadUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + username));
    }

    private Credential findOwnedCredential(Long id, VaultUser user) {
        Credential credential = credentialRepository.findById(id)
                .orElseThrow(() -> new CredentialNotFoundException(id));
        if (!credential.getUser().getId().equals(user.getId())) {
            throw new CredentialNotFoundException(id);
        }
        return credential;
    }
}
