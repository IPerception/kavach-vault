package com.kavach.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateNoteRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Note body is required")
    private String body;

    private List<String> tags;
}
