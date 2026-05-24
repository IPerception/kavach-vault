package com.kavach.totp;

import com.kavach.crypto.EncryptionService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.domain.VaultUser;
import com.kavach.dto.TotpSetupResponse;
import com.kavach.exception.InvalidOtpException;
import com.kavach.repository.VaultUserRepository;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TotpService {

    private static final String ISSUER = "Kavach";

    private final TotpProvider totpProvider;
    private final VaultUserRepository userRepository;
    private final EncryptionService encryptionService;
    private final SessionKeyStore sessionKeyStore;

    // Unconfirmed secrets waiting for the user to scan the QR code and submit a valid code.
    // Keyed by username. Cleared on confirm or server restart (setup is a one-time wizard step).
    private final ConcurrentHashMap<String, String> pendingSecrets = new ConcurrentHashMap<>();

    public TotpService(TotpProvider totpProvider,
                       VaultUserRepository userRepository,
                       EncryptionService encryptionService,
                       SessionKeyStore sessionKeyStore) {
        this.totpProvider = totpProvider;
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
        this.sessionKeyStore = sessionKeyStore;
    }

    public TotpSetupResponse initiateSetup(String username) {
        VaultUser user = loadUser(username);
        String secret = totpProvider.generateSecret();
        pendingSecrets.put(username, secret);
        String qrCodeUri = totpProvider.getQrCodeUri(secret, user.getEmail(), ISSUER);
        return new TotpSetupResponse(secret, qrCodeUri);
    }

    public void confirmSetup(String code, String username) {
        String secret = pendingSecrets.get(username);
        if (secret == null) {
            throw new InvalidOtpException();
        }
        if (!totpProvider.isValidCode(secret, code)) {
            throw new InvalidOtpException();
        }
        pendingSecrets.remove(username);

        VaultUser user = loadUser(username);
        SecretKey masterKey = sessionKeyStore.getKey();
        byte[] encrypted = encryptionService.encrypt(secret.getBytes(StandardCharsets.UTF_8), masterKey);
        user.setTotpSecretEncrypted(encrypted);
        userRepository.save(user);
    }

    public boolean isValidCode(String code, String username) {
        VaultUser user = loadUser(username);
        if (user.getTotpSecretEncrypted() == null) {
            return false;
        }
        SecretKey masterKey = sessionKeyStore.getKey();
        byte[] secretBytes = encryptionService.decrypt(user.getTotpSecretEncrypted(), masterKey);
        String secret = new String(secretBytes, StandardCharsets.UTF_8);
        return totpProvider.isValidCode(secret, code);
    }

    private VaultUser loadUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("User not found: " + username));
    }
}
