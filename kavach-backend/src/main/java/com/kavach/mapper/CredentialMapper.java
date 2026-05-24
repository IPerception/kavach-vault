package com.kavach.mapper;

import com.kavach.domain.Credential;
import com.kavach.dto.CredentialSummaryDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * MapStruct generates the implementation at compile time.
 * Encrypted fields (encryptedPassword, dekEncrypted, iv) are deliberately
 * omitted from toSummaryDto so they are never accidentally included in API responses.
 */
@Mapper(componentModel = "spring")
public interface CredentialMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "purpose", source = "purpose")
    @Mapping(target = "username", source = "username")
    @Mapping(target = "url", source = "url")
    @Mapping(target = "notes", source = "notes")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    CredentialSummaryDto toSummaryDto(Credential credential);

    List<CredentialSummaryDto> toSummaryDtoList(List<Credential> credentials);
}
