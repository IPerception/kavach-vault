package com.kavach.credential;

import com.kavach.crypto.CryptoException;
import com.kavach.crypto.EncryptionService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.domain.AuditAction;
import com.kavach.domain.Credential;
import com.kavach.domain.VaultUser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kavach.dto.CredentialHealthDto;
import com.kavach.dto.CredentialSummaryDto;
import com.kavach.dto.ExportResponse;
import com.kavach.dto.ImportResult;
import com.kavach.dto.request.CreateCredentialRequest;
import com.kavach.dto.request.ImportRequest;
import com.kavach.dto.request.UpdateCredentialRequest;
import com.kavach.event.AuditEvent;
import com.kavach.exception.CredentialNotFoundException;
import com.kavach.exception.DuplicateCredentialException;
import org.springframework.dao.DataIntegrityViolationException;
import com.kavach.mapper.CredentialMapper;
import com.kavach.repository.CredentialRepository;
import com.kavach.repository.VaultUserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class CredentialService {

    private final CredentialRepository credentialRepository;
    private final VaultUserRepository userRepository;
    private final EncryptionService encryptionService;
    private final SessionKeyStore sessionKeyStore;
    private final CredentialMapper credentialMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public CredentialService(CredentialRepository credentialRepository,
                             VaultUserRepository userRepository,
                             EncryptionService encryptionService,
                             SessionKeyStore sessionKeyStore,
                             CredentialMapper credentialMapper,
                             ApplicationEventPublisher eventPublisher,
                             ObjectMapper objectMapper) {
        this.credentialRepository = credentialRepository;
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
        this.sessionKeyStore = sessionKeyStore;
        this.credentialMapper = credentialMapper;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CredentialSummaryDto create(CreateCredentialRequest request, String username) {
        VaultUser user = loadUser(username);
        SecretKey masterKey = sessionKeyStore.getKey();

        byte[] dek = encryptionService.generateDek();
        SecretKey dekKey = encryptionService.bytesToKey(dek);
        byte[] encryptedPassword = encryptionService.encrypt(request.getPassword().getBytes(), dekKey);
        byte[] dekEncrypted = encryptionService.encrypt(dek, masterKey);

        Credential credential = Credential.builder()
                .user(user)
                .purpose(request.getPurpose())
                .username(request.getUsername() != null ? request.getUsername() : "")
                .url(request.getUrl())
                .notes(request.getNotes())
                .encryptedPassword(encryptedPassword)
                .dekEncrypted(dekEncrypted)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        try {
            credential = credentialRepository.save(credential);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateCredentialException(request.getPurpose());
        }

        eventPublisher.publishEvent(new AuditEvent(user, AuditAction.CREATE, null));
        return credentialMapper.toSummaryDto(credential);
    }

    public List<CredentialSummaryDto> list(String username) {
        VaultUser user = loadUser(username);
        List<Credential> credentials = credentialRepository.findAllByUser(user);
        return credentialMapper.toSummaryDtoList(credentials);
    }

    @Transactional
    public CredentialSummaryDto update(Long id, UpdateCredentialRequest request, String username) {
        VaultUser user = loadUser(username);
        Credential credential = findOwnedCredential(id, user);

        credential.setUsername(request.getUsername() != null ? request.getUsername() : "");
        credential.setUrl(request.getUrl());
        credential.setNotes(request.getNotes());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            SecretKey masterKey = sessionKeyStore.getKey();
            byte[] dek = encryptionService.generateDek();
            SecretKey dekKey = encryptionService.bytesToKey(dek);
            byte[] encryptedPassword = encryptionService.encrypt(request.getPassword().getBytes(), dekKey);
            byte[] dekEncrypted = encryptionService.encrypt(dek, masterKey);
            credential.setEncryptedPassword(encryptedPassword);
            credential.setDekEncrypted(dekEncrypted);
        }

        credential.setUpdatedAt(LocalDateTime.now());

        credential = credentialRepository.save(credential);
        eventPublisher.publishEvent(new AuditEvent(user, AuditAction.UPDATE, null));
        return credentialMapper.toSummaryDto(credential);
    }

    @Transactional
    public void delete(Long id, String username) {
        VaultUser user = loadUser(username);
        Credential credential = findOwnedCredential(id, user);
        credentialRepository.delete(credential);
        eventPublisher.publishEvent(new AuditEvent(user, AuditAction.DELETE, null));
    }

    public ExportResponse exportVault(String username) {
        VaultUser user = loadUser(username);
        SecretKey masterKey = sessionKeyStore.getKey();
        List<Credential> credentials = credentialRepository.findAllByUser(user);

        List<Map<String, Object>> entries = new ArrayList<>();
        for (Credential c : credentials) {
            byte[] dek = encryptionService.decrypt(c.getDekEncrypted(), masterKey);
            SecretKey dekKey = encryptionService.bytesToKey(dek);
            byte[] pw = encryptionService.decrypt(c.getEncryptedPassword(), dekKey);
            Arrays.fill(dek, (byte) 0);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("purpose", c.getPurpose());
            entry.put("username", c.getUsername());
            entry.put("password", new String(pw, StandardCharsets.UTF_8));
            entry.put("url", c.getUrl());
            entry.put("notes", c.getNotes());
            Arrays.fill(pw, (byte) 0);
            entries.add(entry);
        }

        try {
            byte[] json = objectMapper.writeValueAsBytes(entries);
            byte[] encrypted = encryptionService.encrypt(json, masterKey);
            Arrays.fill(json, (byte) 0);
            return ExportResponse.builder()
                    .version(1)
                    .data(Base64.getEncoder().encodeToString(encrypted))
                    .build();
        } catch (Exception e) {
            throw new CryptoException("Export serialization failed", e);
        }
    }

    public ImportResult importVault(ImportRequest request, String username) {
        if (request.getVersion() != 1) {
            throw new IllegalArgumentException("Unsupported export version: " + request.getVersion());
        }

        SecretKey masterKey = sessionKeyStore.getKey();
        byte[] encrypted;
        try {
            encrypted = Base64.getDecoder().decode(request.getData());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid export file: data is not valid base64");
        }

        byte[] json;
        try {
            json = encryptionService.decrypt(encrypted, masterKey);
        } catch (CryptoException e) {
            throw new IllegalArgumentException("Could not decrypt export file. It may have been created with a different master password.");
        }

        List<Map<String, Object>> entries;
        try {
            entries = objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid export file format");
        } finally {
            Arrays.fill(json, (byte) 0);
        }

        int imported = 0, skipped = 0;
        for (Map<String, Object> entry : entries) {
            try {
                String purpose = (String) entry.get("purpose");
                String entryUsername = entry.get("username") != null ? (String) entry.get("username") : "";
                String password = (String) entry.get("password");
                String url = entry.get("url") != null ? (String) entry.get("url") : "";
                String notes = entry.get("notes") != null ? (String) entry.get("notes") : "";
                if (purpose == null || password == null) { skipped++; continue; }
                create(new CreateCredentialRequest(purpose, entryUsername, password, url, notes), username);
                imported++;
            } catch (DuplicateCredentialException | DataIntegrityViolationException e) {
                skipped++;
            }
        }

        return ImportResult.builder().imported(imported).skipped(skipped).build();
    }

    public List<CredentialHealthDto> healthReport(String username) {
        VaultUser user = loadUser(username);
        SecretKey masterKey = sessionKeyStore.getKey();
        List<Credential> credentials = credentialRepository.findAllByUser(user);

        // Decrypt each password and compute a SHA-256 hash for duplicate detection.
        // Hashes are never sent to the client -- only the duplicate flag is.
        Map<Long, byte[]> decrypted = new HashMap<>();
        Map<String, List<Long>> hashGroups = new HashMap<>();

        for (Credential c : credentials) {
            byte[] dek = encryptionService.decrypt(c.getDekEncrypted(), masterKey);
            SecretKey dekKey = encryptionService.bytesToKey(dek);
            byte[] pw = encryptionService.decrypt(c.getEncryptedPassword(), dekKey);
            Arrays.fill(dek, (byte) 0);

            String hash = sha256Hex(pw);
            decrypted.put(c.getId(), pw);
            hashGroups.computeIfAbsent(hash, k -> new ArrayList<>()).add(c.getId());
        }

        Set<Long> duplicateIds = new HashSet<>();
        for (List<Long> ids : hashGroups.values()) {
            if (ids.size() > 1) duplicateIds.addAll(ids);
        }

        List<CredentialHealthDto> report = new ArrayList<>();
        for (Credential c : credentials) {
            byte[] pw = decrypted.get(c.getId());
            int score = scorePassword(pw);
            Arrays.fill(pw, (byte) 0);

            report.add(CredentialHealthDto.builder()
                    .id(c.getId())
                    .purpose(c.getPurpose())
                    .strengthScore(score)
                    .strengthLabel(strengthLabel(score))
                    .duplicate(duplicateIds.contains(c.getId()))
                    .updatedAt(c.getUpdatedAt())
                    .build());
        }
        return report;
    }

    private int scorePassword(byte[] pw) {
        int score = 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        boolean hasUpper = false, hasDigit = false, hasSpecial = false;
        for (byte b : pw) {
            char ch = (char) (b & 0xFF);
            if (Character.isUpperCase(ch)) hasUpper = true;
            else if (Character.isDigit(ch)) hasDigit = true;
            else if (!Character.isLetterOrDigit(ch)) hasSpecial = true;
        }
        if (hasUpper) score++;
        if (hasDigit) score++;
        if (hasSpecial) score++;
        return Math.min(4, score);
    }

    private String strengthLabel(int score) {
        return switch (score) {
            case 0 -> "Very Weak";
            case 1 -> "Weak";
            case 2 -> "Fair";
            case 3 -> "Strong";
            default -> "Very Strong";
        };
    }

    private String sha256Hex(byte[] input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(input);
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new CryptoException("SHA-256 unavailable", e);
        }
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
