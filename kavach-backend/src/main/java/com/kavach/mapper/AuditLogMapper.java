package com.kavach.mapper;

import com.kavach.domain.AuditLog;
import com.kavach.dto.AuditLogDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Maps AuditLog entities to DTOs for the audit log API endpoint.
 * action is stored as an enum in the entity but exposed as a String in the DTO
 * so the API contract is not coupled to Java enum naming.
 */
@Mapper(componentModel = "spring")
public interface AuditLogMapper {

    @Mapping(target = "action", expression = "java(auditLog.getAction().name())")
    @Mapping(target = "purpose", expression = "java(auditLog.getCredential() != null ? auditLog.getCredential().getPurpose() : null)")
    AuditLogDto toDto(AuditLog auditLog);

    List<AuditLogDto> toDtoList(List<AuditLog> logs);
}
