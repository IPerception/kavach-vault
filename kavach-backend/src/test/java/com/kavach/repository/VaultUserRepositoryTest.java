package com.kavach.repository;

import com.kavach.config.DatabaseConfig;
import com.kavach.domain.VaultUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(DatabaseConfig.class)
@ActiveProfiles("test")
class VaultUserRepositoryTest {

    @Autowired
    VaultUserRepository repository;

    @Test
    void save_andFindByUsername() {
        repository.save(buildUser("admin", "admin@kavach.local"));

        Optional<VaultUser> found = repository.findByUsername("admin");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("admin@kavach.local");
    }

    @Test
    void findByUsername_returnsEmpty_whenNotFound() {
        assertThat(repository.findByUsername("nonexistent")).isEmpty();
    }

    @Test
    void duplicateUsername_throwsDataIntegrityViolation() {
        repository.saveAndFlush(buildUser("admin", "first@kavach.local"));

        assertThatThrownBy(() -> repository.saveAndFlush(buildUser("admin", "second@kavach.local")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void existsByUsername_returnsTrue_whenUserExists() {
        repository.save(buildUser("admin", "admin@kavach.local"));

        assertThat(repository.existsByUsername("admin")).isTrue();
        assertThat(repository.existsByUsername("nobody")).isFalse();
    }

    private VaultUser buildUser(String username, String email) {
        return VaultUser.builder()
                .username(username)
                .masterPasswordHash("$2a$12$dummyhash")
                .pbkdf2Salt(new byte[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
                .email(email)
                .createdAt(LocalDateTime.now())
                .build();
    }
}
