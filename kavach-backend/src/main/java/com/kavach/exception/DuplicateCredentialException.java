package com.kavach.exception;

public class DuplicateCredentialException extends RuntimeException {
    public DuplicateCredentialException(String purpose) {
        super("A credential for '" + purpose + "' already exists");
    }
}
