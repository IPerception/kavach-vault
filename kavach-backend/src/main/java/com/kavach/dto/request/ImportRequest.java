package com.kavach.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ImportRequest {
    private int version;
    private String data;
}
