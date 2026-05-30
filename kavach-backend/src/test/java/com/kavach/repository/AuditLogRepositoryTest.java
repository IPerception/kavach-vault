package com.kavach.repository;

import com.kavach.config.DatabaseConfig;
import com.kavach.domain.AuditAction;
import com.kavach.domain.AuditLog;
import com.kavach.domain.Credential;
import com.kavach.domain.VaultUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(DatabaseConfig.class)
@ActiveProfiles("test")
class AuditLogRepositoryTest {

    @Autowired
    AuditLogRepository auditLogRepository;

    @Autowired
    VaultUserRepository userRepository;

    @Autowired
    CredentialRepository credentialRepository;

    private VaultUser user;
    private Credential credential;

    @BeforeEach
    void setUp() {
        user = userRepository.saveAndFlush(VaultUser.builder()
                .username("admin")
                .masterPasswordHash("$2a$12$dummyhash")
                .pbkdf2Salt(new byte[16])
                .email("admin@kavach.local")
                .createdAt(LocalDateTime.now())
                .build());

        credential = credentialRepository.saveAndFlush(Credential.builder()
                .user(user)
                .purpose("Gmail")
                .username("john@example.com")
                .credentialType("PASSWORD")
                .favourite(false)
                .encryptedPassword(new byte[]{1, 2, 3})
                .dekEncrypted(new byte[]{4, 5, 6})
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    @Test
    void save_accountLevelEvent_withoutCredential() {
        AuditLog event = AuditLog.builder()
                .user(user)
                .action(AuditAction.LOGIN)
                .timestamp(LocalDateTime.now())
                .ipAddress("127.0.0.1")
                .build();

        AuditLog saved = auditLogRepository.save(event);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCredential()).isNull();
        assertThat(saved.getAction()).isEqualTo(AuditAction.LOGIN);
    }

    @Test
    void save_credentialEvent_withCredentialReference() {
        AuditLog event = AuditLog.builder()
                .user(user)
                .credential(credential)
                .action(AuditAction.VIEW)
                .timestamp(LocalDateTime.now())
                .ipAddress("127.0.0.1")
                .build();

        AuditLog saved = auditLogRepository.save(event);

        assertThat(saved.getCredential()).isNotNull();
        assertThat(saved.getCredential().getPurpose()).isEqualTo("Gmail");
    }

    @Test
    void findAllByUser_returnsMostRecentFirst() {
        auditLogRepository.save(buildLog(AuditAction.LOGIN, LocalDateTime.now().minusMinutes(5)));
        auditLogRepository.save(buildLog(AuditAction.VIEW, LocalDateTime.now()));

        List<AuditLog> logs = auditLogRepository.findAllByUserOrderByTimestampDesc(user);

        assertThat(logs).hasSize(2);
        assertThat(logs.get(0).getAction()).isEqualTo(AuditAction.VIEW);
        assertThat(logs.get(1).getAction()).isEqualTo(AuditAction.LOGIN);
    }

    @Test
    void findAllByUser_supportsPagination() {
        for (int i = 0; i < 5; i++) {
            auditLogRepository.save(buildLog(AuditAction.VIEW, LocalDateTime.now().plusSeconds(i)));
        }

        Page<AuditLog> page = auditLogRepository.findAllByUser(
                user, PageRequest.of(0, 3, Sort.by(Sort.Direction.DESC, "timestamp")));

        assertThat(page.getContent()).hasSize(3);
        assertThat(page.getTotalElements()).isEqualTo(5);
    }

    private AuditLog buildLog(AuditAction action, LocalDateTime timestamp) {
        return AuditLog.builder()
                .user(user)
                .action(action)
                .timestamp(timestamp)
                .ipAddress("127.0.0.1")
                .build();
    }
}
