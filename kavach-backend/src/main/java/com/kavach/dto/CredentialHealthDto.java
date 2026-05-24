package com.kavach.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CredentialHealthDto {
    private Long id;
    private String purpose;
    private int strengthScore;
    private String strengthLabel;
    private boolean duplicate;
    private LocalDateTime updatedAt;
}
