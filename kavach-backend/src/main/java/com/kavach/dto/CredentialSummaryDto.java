package com.kavach.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Safe public view of a credential - no encrypted fields exposed.
 * Returned by GET /api/credentials (list) and used in the dashboard.
 */
@Getter
@Builder
@AllArgsConstructor
public class CredentialSummaryDto {

    private final Long id;
    private final String purpose;
    private final String username;
    private final String url;
    private final String notes;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
}
