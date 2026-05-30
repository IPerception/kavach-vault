package com.kavach.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BreachCheckResult {
    private Long id;
    private String purpose;
    private boolean breached;
    private int count;
}
