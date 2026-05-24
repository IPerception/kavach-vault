package com.kavach.repository;

import com.kavach.config.DatabaseConfig;
import com.kavach.domain.Credential;
import com.kavach.domain.VaultUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(DatabaseConfig.class)
@ActiveProfiles("test")
class CredentialRepositoryTest {

    @Autowired
    CredentialRepository credentialRepository;

    @Autowired
    VaultUserRepository userRepository;

    @Autowired
    AuditLogRepository auditLogRepository;

    @Autowired
    EntityManager entityManager;

    private VaultUser user;

    @BeforeEach
    void setUp() {
        // FK order: credential and audit_log reference vault_user, so clear them first.
        entityManager.createNativeQuery("DELETE FROM credential").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM audit_log").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM vault_user").executeUpdate();
        entityManager.flush();
        user = userRepository.saveAndFlush(VaultUser.builder()
                .username("admin")
                .masterPasswordHash("$2a$12$dummyhash")
                .pbkdf2Salt(new byte[16])
                .email("admin@kavach.local")
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Test
    void save_andFindAllByUser() {
        credentialRepository.save(buildCredential(user, "Gmail"));
        credentialRepository.save(buildCredential(user, "GitHub"));

        List<Credential> found = credentialRepository.findAllByUser(user);

        assertThat(found).hasSize(2);
        assertThat(found).extracting(Credential::getPurpose)
                .containsExactlyInAnyOrder("Gmail", "GitHub");
    }

    @Test
    void findByUserAndPurpose_returnsMatchingCredential() {
        credentialRepository.save(buildCredential(user, "Gmail"));

        assertThat(credentialRepository.findByUserAndPurpose(user, "Gmail")).isPresent();
        assertThat(credentialRepository.findByUserAndPurpose(user, "GitHub")).isEmpty();
    }

    @Test
    void duplicatePurpose_forSameUser_throwsDataIntegrityViolation() {
        credentialRepository.saveAndFlush(buildCredential(user, "Gmail"));

        assertThatThrownBy(() -> credentialRepository.saveAndFlush(buildCredential(user, "Gmail")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void samePurpose_forDifferentUsers_isAllowed() {
        VaultUser otherUser = userRepository.saveAndFlush(VaultUser.builder()
                .username("other")
                .masterPasswordHash("$2a$12$otherhash")
                .pbkdf2Salt(new byte[16])
                .email("other@kavach.local")
                .createdAt(LocalDateTime.now())
                .build());

        credentialRepository.saveAndFlush(buildCredential(user, "Gmail"));
        credentialRepository.saveAndFlush(buildCredential(otherUser, "Gmail"));

        assertThat(credentialRepository.count()).isEqualTo(2);
    }

    private Credential buildCredential(VaultUser owner, String purpose) {
        return Credential.builder()
                .user(owner)
                .purpose(purpose)
                .username("john@example.com")
                .encryptedPassword(new byte[]{1, 2, 3})
                .dekEncrypted(new byte[]{4, 5, 6})
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
