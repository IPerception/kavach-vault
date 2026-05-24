package com.kavach.exception;

public class CredentialNotFoundException extends RuntimeException {
    public CredentialNotFoundException(Long id) {
        super("Credential not found: " + id);
    }
}
