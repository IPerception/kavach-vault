package com.kavach.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCredentialRequest {

    @NotBlank(message = "Purpose is required")
    private String purpose;

    private String username;

    @NotBlank(message = "Password is required")
    private String password;

    private String url;

    private String notes;
}
