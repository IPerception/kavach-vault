package com.kavach.repository;

import com.kavach.config.DatabaseConfig;
import com.kavach.domain.AppConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(DatabaseConfig.class)
@ActiveProfiles("test")
class AppConfigRepositoryTest {

    @Autowired
    AppConfigRepository repository;

    @Test
    void save_andFindById() {
        AppConfig config = AppConfig.builder()
                .key("smtp.host")
                .valueEncrypted(new byte[]{10, 20, 30})
                .updatedAt(LocalDateTime.now())
                .build();

        repository.saveAndFlush(config);

        Optional<AppConfig> found = repository.findById("smtp.host");
        assertThat(found).isPresent();
        assertThat(found.get().getValueEncrypted()).isEqualTo(new byte[]{10, 20, 30});
    }

    @Test
    void save_overwrites_existingKey() {
        repository.saveAndFlush(AppConfig.builder()
                .key("smtp.port")
                .valueEncrypted(new byte[]{1})
                .updatedAt(LocalDateTime.now())
                .build());

        repository.saveAndFlush(AppConfig.builder()
                .key("smtp.port")
                .valueEncrypted(new byte[]{2})
                .updatedAt(LocalDateTime.now())
                .build());

        assertThat(repository.count()).isEqualTo(1);
        assertThat(repository.findById("smtp.port").get().getValueEncrypted())
                .isEqualTo(new byte[]{2});
    }

    @Test
    void findById_returnsEmpty_forMissingKey() {
        assertThat(repository.findById("nonexistent")).isEmpty();
    }
}
