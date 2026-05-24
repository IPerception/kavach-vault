package com.kavach.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Returned by GET /api/audit-log (paginated).
 * purpose is the credential's purpose label (e.g. "Gmail"), null for account-level events.
 */
@Getter
@Builder
@AllArgsConstructor
public class AuditLogDto {

    private final Long id;
    private final String action;
    private final String purpose;
    private final LocalDateTime timestamp;
    private final String ipAddress;
}
