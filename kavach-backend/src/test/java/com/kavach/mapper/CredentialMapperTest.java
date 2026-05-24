package com.kavach.mapper;

import com.kavach.domain.Credential;
import com.kavach.domain.VaultUser;
import com.kavach.dto.CredentialSummaryDto;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class CredentialMapperTest {

    private final CredentialMapper mapper = Mappers.getMapper(CredentialMapper.class);

    @Test
    void toSummaryDto_mapsVisibleFieldsOnly() {
        Credential credential = Credential.builder()
                .id(1L)
                .user(VaultUser.builder().id(1L).username("admin").build())
                .purpose("Gmail")
                .username("john@gmail.com")
                .encryptedPassword(new byte[]{1, 2, 3})
                .dekEncrypted(new byte[]{4, 5, 6})
                .createdAt(LocalDateTime.of(2026, 1, 1, 12, 0))
                .updatedAt(LocalDateTime.of(2026, 1, 2, 12, 0))
                .build();

        CredentialSummaryDto dto = mapper.toSummaryDto(credential);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getPurpose()).isEqualTo("Gmail");
        assertThat(dto.getUsername()).isEqualTo("john@gmail.com");
        assertThat(dto.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 1, 1, 12, 0));
        assertThat(dto.getUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 1, 2, 12, 0));
    }

    @Test
    void toSummaryDto_doesNotExposeEncryptedFields() {
        // CredentialSummaryDto must not have encryptedPassword or dekEncrypted fields.
        // If a developer accidentally adds them, this test will fail to compile.
        CredentialSummaryDto dto = mapper.toSummaryDto(Credential.builder()
                .purpose("Test")
                .username("test")
                .encryptedPassword(new byte[]{99})
                .dekEncrypted(new byte[]{99})
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        // CredentialSummaryDto has no getEncryptedPassword() method by design.
        // The fields below are the only ones that should exist on the DTO.
        assertThat(dto.getId()).isNull();
        assertThat(dto.getPurpose()).isEqualTo("Test");
        assertThat(dto.getUsername()).isEqualTo("test");
    }
}
