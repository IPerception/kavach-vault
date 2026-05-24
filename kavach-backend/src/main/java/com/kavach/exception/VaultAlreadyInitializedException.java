package com.kavach.exception;

public class VaultAlreadyInitializedException extends RuntimeException {

    public VaultAlreadyInitializedException() {
        super("Vault is already initialized. Only one vault owner is allowed.");
    }
}
