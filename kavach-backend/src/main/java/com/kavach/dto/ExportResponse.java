package com.kavach.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ExportResponse {
    private int version;
    private String data;
}
