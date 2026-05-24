package com.kavach.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ImportResult {
    private int imported;
    private int skipped;
}
