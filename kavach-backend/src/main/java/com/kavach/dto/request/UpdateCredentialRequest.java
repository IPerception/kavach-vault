package com.kavach.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request body for PUT /api/credentials/{id}.
 * Purpose is immutable after creation (it is part of the unique key).
 * password is optional -- null or blank means keep the existing encrypted password.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCredentialRequest {

    private String username;

    private String password;

    private String url;

    private String notes;
}
