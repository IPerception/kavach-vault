package com.kavach.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Safe public view of the vault owner - no password hash or salt exposed.
 */
@Getter
@Builder
@AllArgsConstructor
public class VaultUserDto {

    private final Long id;
    private final String username;
    private final String email;
    private final LocalDateTime createdAt;
}
