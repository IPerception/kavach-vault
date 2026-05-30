package com.kavach.credential;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kavach.crypto.EncryptionService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.domain.AuditAction;
import com.kavach.domain.Credential;
import com.kavach.domain.VaultUser;
import com.kavach.dto.CredentialSummaryDto;
import com.kavach.dto.request.CreateCredentialRequest;
import com.kavach.dto.request.ImportRequest;
import com.kavach.dto.request.UpdateCredentialRequest;
import com.kavach.event.AuditEvent;
import com.kavach.exception.CredentialNotFoundException;
import com.kavach.exception.DuplicateCredentialException;
import com.kavach.mapper.CredentialMapper;
import com.kavach.repository.CredentialRepository;
import com.kavach.repository.VaultUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CredentialServiceTest {

    @Mock CredentialRepository credentialRepository;
    @Mock VaultUserRepository userRepository;
    @Mock EncryptionService encryptionService;
    @Mock SessionKeyStore sessionKeyStore;
    @Mock CredentialMapper credentialMapper;
    @Mock ApplicationEventPublisher eventPublisher;

    private CredentialService credentialService;
    private VaultUser testUser;
    private SecretKey masterKey;

    @BeforeEach
    void setUp() {
        credentialService = new CredentialService(
                credentialRepository, userRepository, encryptionService,
                sessionKeyStore, credentialMapper, eventPublisher, new ObjectMapper());
        testUser = VaultUser.builder()
                .id(1L).username("alice").email("alice@example.com")
                .masterPasswordHash("$2a$hashed").pbkdf2Salt(new byte[16])
                .createdAt(LocalDateTime.now()).build();
        masterKey = new SecretKeySpec(new byte[32], "AES");
    }

    // --- create ---

    @Test
    void create_success_encryptsAndSaves() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.generateDek()).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(credentialRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        CredentialSummaryDto summary = CredentialSummaryDto.builder()
                .id(1L).purpose("Gmail").username("alice").build();
        when(credentialMapper.toSummaryDto(any())).thenReturn(summary);

        CredentialSummaryDto result = credentialService.create(
                new CreateCredentialRequest("Gmail", "alice", "secret", "", "", null), "alice");

        verify(credentialRepository).save(argThat(c ->
                "Gmail".equals(c.getPurpose()) &&
                "alice".equals(c.getUsername()) &&
                c.getEncryptedPassword() != null &&
                c.getDekEncrypted() != null
        ));
        assertThat(result.getPurpose()).isEqualTo("Gmail");
    }

    @Test
    void create_encryptionCalledTwice_oncePwOnce_dek() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.generateDek()).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(credentialRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(credentialMapper.toSummaryDto(any())).thenReturn(
                CredentialSummaryDto.builder().id(1L).purpose("X").username("u").build());

        credentialService.create(new CreateCredentialRequest("X", "u", "pw", "", "", null), "alice");

        // encrypt called twice: once for DEK (with masterKey), once for password (with DEK key)
        verify(encryptionService, times(2)).encrypt(any(), any());
    }

    @Test
    void create_duplicatePurpose_throwsDuplicateCredentialException() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.generateDek()).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(credentialRepository.save(any())).thenThrow(DataIntegrityViolationException.class);

        assertThatThrownBy(() ->
                credentialService.create(new CreateCredentialRequest("Gmail", "alice", "pw", "", "", null), "alice"))
                .isInstanceOf(DuplicateCredentialException.class);
    }

    @Test
    void create_publishesCreateAuditEvent() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.generateDek()).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(credentialRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(credentialMapper.toSummaryDto(any())).thenReturn(
                CredentialSummaryDto.builder().id(1L).purpose("Gmail").username("alice").build());

        credentialService.create(new CreateCredentialRequest("Gmail", "alice", "pw", "", "", null), "alice");

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(captor.capture());
        AuditEvent event = (AuditEvent) captor.getValue();
        assertThat(event.action()).isEqualTo(AuditAction.CREATE);
        assertThat(event.user()).isEqualTo(testUser);
    }

    // --- list ---

    @Test
    void list_returnsAllCredentialsForUser() {
        Credential c1 = buildCredential(1L, "Gmail");
        Credential c2 = buildCredential(2L, "GitHub");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of(c1, c2));
        CredentialSummaryDto d1 = CredentialSummaryDto.builder().id(1L).purpose("Gmail").username("alice").build();
        CredentialSummaryDto d2 = CredentialSummaryDto.builder().id(2L).purpose("GitHub").username("alice").build();
        when(credentialMapper.toSummaryDtoList(List.of(c1, c2))).thenReturn(List.of(d1, d2));

        List<CredentialSummaryDto> result = credentialService.list("alice");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getPurpose()).isEqualTo("Gmail");
        assertThat(result.get(1).getPurpose()).isEqualTo("GitHub");
    }

    @Test
    void list_emptyVault_returnsEmptyList() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of());
        when(credentialMapper.toSummaryDtoList(List.of())).thenReturn(List.of());

        List<CredentialSummaryDto> result = credentialService.list("alice");

        assertThat(result).isEmpty();
    }

    // --- update ---

    @Test
    void update_success_reEncryptsAndSaves() {
        Credential existing = buildCredential(1L, "Gmail");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.generateDek()).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(credentialRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(credentialMapper.toSummaryDto(any())).thenReturn(
                CredentialSummaryDto.builder().id(1L).purpose("Gmail").username("newUser").build());

        CredentialSummaryDto result = credentialService.update(
                1L, new UpdateCredentialRequest("newUser", "newPw", "", "", null), "alice");

        verify(credentialRepository).save(argThat(c ->
                "newUser".equals(c.getUsername()) &&
                c.getEncryptedPassword() != null
        ));
        assertThat(result.getUsername()).isEqualTo("newUser");
    }

    @Test
    void update_credentialNotFound_throwsCredentialNotFoundException() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                credentialService.update(99L, new UpdateCredentialRequest("u", "p", "", "", null), "alice"))
                .isInstanceOf(CredentialNotFoundException.class);
    }

    @Test
    void update_credentialBelongsToDifferentUser_throwsCredentialNotFoundException() {
        VaultUser otherUser = VaultUser.builder().id(2L).username("bob")
                .masterPasswordHash("h").pbkdf2Salt(new byte[16])
                .email("bob@example.com").createdAt(LocalDateTime.now()).build();
        Credential existing = Credential.builder()
                .id(1L).user(otherUser).purpose("Gmail").username("bob")
                .encryptedPassword(new byte[60]).dekEncrypted(new byte[60])
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() ->
                credentialService.update(1L, new UpdateCredentialRequest("u", "p", "", "", null), "alice"))
                .isInstanceOf(CredentialNotFoundException.class);
    }

    @Test
    void update_publishesUpdateAuditEvent() {
        Credential existing = buildCredential(1L, "Gmail");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.generateDek()).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(credentialRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(credentialMapper.toSummaryDto(any())).thenReturn(
                CredentialSummaryDto.builder().id(1L).purpose("Gmail").username("alice").build());

        credentialService.update(1L, new UpdateCredentialRequest("alice", "newPw", "", "", null), "alice");

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(captor.capture());
        AuditEvent event = (AuditEvent) captor.getValue();
        assertThat(event.action()).isEqualTo(AuditAction.UPDATE);
    }

    // --- delete ---

    @Test
    void delete_success_deletesFromRepository() {
        Credential existing = buildCredential(1L, "Gmail");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(existing));

        credentialService.delete(1L, "alice");

        verify(credentialRepository).delete(existing);
    }

    @Test
    void delete_credentialNotFound_throwsCredentialNotFoundException() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> credentialService.delete(99L, "alice"))
                .isInstanceOf(CredentialNotFoundException.class);
    }

    @Test
    void delete_credentialBelongsToDifferentUser_throwsCredentialNotFoundException() {
        VaultUser otherUser = VaultUser.builder().id(2L).username("bob")
                .masterPasswordHash("h").pbkdf2Salt(new byte[16])
                .email("bob@example.com").createdAt(LocalDateTime.now()).build();
        Credential existing = Credential.builder()
                .id(1L).user(otherUser).purpose("Gmail").username("bob")
                .encryptedPassword(new byte[60]).dekEncrypted(new byte[60])
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> credentialService.delete(1L, "alice"))
                .isInstanceOf(CredentialNotFoundException.class);
    }

    @Test
    void delete_publishesDeleteAuditEvent() {
        Credential existing = buildCredential(1L, "Gmail");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(credentialRepository.findById(1L)).thenReturn(Optional.of(existing));

        credentialService.delete(1L, "alice");

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(captor.capture());
        AuditEvent event = (AuditEvent) captor.getValue();
        assertThat(event.action()).isEqualTo(AuditAction.DELETE);
    }

    // --- exportVault ---

    @Test
    void exportVault_emptyVault_returnsVersionOneWithEmptyArray() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of());
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);

        var result = credentialService.exportVault("alice");

        assertThat(result.getVersion()).isEqualTo(1);
        assertThat(result.getData()).isNotNull();
    }

    @Test
    void exportVault_singleCredential_includesPurposeInExportedJson() throws Exception {
        Credential cred = buildCredential(1L, "Gmail");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of(cred));
        when(encryptionService.decrypt(any(), any()))
                .thenReturn(new byte[32])
                .thenReturn("secret".getBytes(StandardCharsets.UTF_8));
        when(encryptionService.bytesToKey(any())).thenReturn(masterKey);
        // Capture the JSON bytes passed to encrypt so we can assert on them
        when(encryptionService.encrypt(any(), any())).thenAnswer(inv -> {
            byte[] json = inv.getArgument(0);
            // store it in a field via closure — parse here to verify
            String jsonStr = new String(json, StandardCharsets.UTF_8);
            assertThat(jsonStr).contains("Gmail").contains("secret");
            return new byte[60];
        });

        credentialService.exportVault("alice");
    }

    // --- importVault ---

    @Test
    void importVault_unsupportedVersion_throwsIllegalArgumentException() {
        ImportRequest request = new ImportRequest();
        // version defaults to 0 — unsupported
        assertThatThrownBy(() -> credentialService.importVault(request, "alice"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported export version");
    }

    @Test
    void importVault_invalidBase64Data_throwsIllegalArgumentException() throws Exception {
        ImportRequest request = buildImportRequest(1, "not-valid-base64!!!");

        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        // base64 decode fails before decrypt or loadUser are ever called

        assertThatThrownBy(() -> credentialService.importVault(request, "alice"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("valid base64");
    }

    @Test
    void importVault_validPayload_importsCredentials() throws Exception {
        String json = "[{\"purpose\":\"Gmail\",\"username\":\"alice\",\"password\":\"pw\",\"url\":\"\",\"notes\":\"\"}]";
        byte[] jsonBytes = json.getBytes(StandardCharsets.UTF_8);
        byte[] fakeEncrypted = new byte[60];
        String base64Data = Base64.getEncoder().encodeToString(fakeEncrypted);
        ImportRequest request = buildImportRequest(1, base64Data);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.decrypt(any(), any())).thenReturn(jsonBytes);
        // stubs for the internal create() call
        when(encryptionService.generateDek()).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(credentialRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(credentialMapper.toSummaryDto(any())).thenReturn(
                CredentialSummaryDto.builder().id(1L).purpose("Gmail").username("alice").build());

        var result = credentialService.importVault(request, "alice");

        assertThat(result.getImported()).isEqualTo(1);
        assertThat(result.getSkipped()).isZero();
    }

    @Test
    void importVault_duplicateCredential_skipsAndCounts() throws Exception {
        String json = "[{\"purpose\":\"Gmail\",\"username\":\"alice\",\"password\":\"pw\",\"url\":\"\",\"notes\":\"\"}]";
        byte[] jsonBytes = json.getBytes(StandardCharsets.UTF_8);
        ImportRequest request = buildImportRequest(1, Base64.getEncoder().encodeToString(new byte[60]));

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(encryptionService.decrypt(any(), any())).thenReturn(jsonBytes);
        when(encryptionService.generateDek()).thenReturn(new byte[32]);
        when(encryptionService.encrypt(any(), any())).thenReturn(new byte[60]);
        when(credentialRepository.save(any())).thenThrow(DataIntegrityViolationException.class);

        var result = credentialService.importVault(request, "alice");

        assertThat(result.getImported()).isZero();
        assertThat(result.getSkipped()).isEqualTo(1);
    }

    private ImportRequest buildImportRequest(int version, String data) throws Exception {
        ImportRequest req = new ImportRequest();
        java.lang.reflect.Field versionField = ImportRequest.class.getDeclaredField("version");
        java.lang.reflect.Field dataField = ImportRequest.class.getDeclaredField("data");
        versionField.setAccessible(true);
        dataField.setAccessible(true);
        versionField.set(req, version);
        dataField.set(req, data);
        return req;
    }

    // --- healthReport ---

    @Test
    void healthReport_emptyVault_returnsEmptyList() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of());

        assertThat(credentialService.healthReport("alice")).isEmpty();
    }

    @Test
    void healthReport_weakPassword_scoreIsZeroAndLabelIsVeryWeak() {
        Credential cred = buildCredential(1L, "Gmail");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of(cred));
        when(encryptionService.decrypt(any(), any()))
                .thenReturn(new byte[32])        // first call = DEK
                .thenReturn("abc".getBytes());   // second call = plaintext password
        when(encryptionService.bytesToKey(any())).thenReturn(masterKey);

        var report = credentialService.healthReport("alice");

        assertThat(report).hasSize(1);
        assertThat(report.get(0).getStrengthScore()).isZero();
        assertThat(report.get(0).getStrengthLabel()).isEqualTo("Very Weak");
    }

    @Test
    void healthReport_strongPassword_scoreIsFourAndLabelIsVeryStrong() {
        Credential cred = buildCredential(1L, "GitHub");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of(cred));
        when(encryptionService.decrypt(any(), any()))
                .thenReturn(new byte[32])
                .thenReturn("Str0ng!Pass#1".getBytes());  // >=12, upper, digit, special
        when(encryptionService.bytesToKey(any())).thenReturn(masterKey);

        var report = credentialService.healthReport("alice");

        assertThat(report.get(0).getStrengthScore()).isEqualTo(4);
        assertThat(report.get(0).getStrengthLabel()).isEqualTo("Very Strong");
    }

    @Test
    void healthReport_duplicatePasswords_bothFlaggedAsDuplicate() {
        Credential c1 = buildCredential(1L, "Gmail");
        Credential c2 = buildCredential(2L, "GitHub");
        byte[] sharedPassword = "shared123".getBytes();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of(c1, c2));
        when(encryptionService.decrypt(any(), any()))
                .thenReturn(new byte[32]).thenReturn(sharedPassword)   // c1
                .thenReturn(new byte[32]).thenReturn(sharedPassword);  // c2
        when(encryptionService.bytesToKey(any())).thenReturn(masterKey);

        var report = credentialService.healthReport("alice");

        assertThat(report).hasSize(2);
        assertThat(report).allMatch(r -> r.isDuplicate());
    }

    @Test
    void healthReport_distinctPasswords_neitherFlaggedAsDuplicate() {
        Credential c1 = buildCredential(1L, "Gmail");
        Credential c2 = buildCredential(2L, "GitHub");

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of(c1, c2));
        when(encryptionService.decrypt(any(), any()))
                .thenReturn(new byte[32]).thenReturn("passwordA".getBytes())
                .thenReturn(new byte[32]).thenReturn("passwordB".getBytes());
        when(encryptionService.bytesToKey(any())).thenReturn(masterKey);

        var report = credentialService.healthReport("alice");

        assertThat(report).noneMatch(r -> r.isDuplicate());
    }

    @Test
    void healthReport_includesUpdatedAt() {
        LocalDateTime updatedAt = LocalDateTime.of(2025, 1, 1, 12, 0);
        Credential cred = Credential.builder()
                .id(1L).user(testUser).purpose("Gmail").username("alice")
                .encryptedPassword(new byte[60]).dekEncrypted(new byte[60])
                .createdAt(updatedAt).updatedAt(updatedAt).build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(sessionKeyStore.getKey()).thenReturn(masterKey);
        when(credentialRepository.findAllByUser(testUser)).thenReturn(List.of(cred));
        when(encryptionService.decrypt(any(), any()))
                .thenReturn(new byte[32]).thenReturn("pw".getBytes());
        when(encryptionService.bytesToKey(any())).thenReturn(masterKey);

        var report = credentialService.healthReport("alice");

        assertThat(report.get(0).getUpdatedAt()).isEqualTo(updatedAt);
    }

    private Credential buildCredential(Long id, String purpose) {
        return Credential.builder()
                .id(id).user(testUser).purpose(purpose).username("alice")
                .credentialType("PASSWORD").favourite(false)
                .encryptedPassword(new byte[60]).dekEncrypted(new byte[60])
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
    }
}
