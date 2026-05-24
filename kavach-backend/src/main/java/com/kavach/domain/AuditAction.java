package com.kavach.domain;

/**
 * All events that are recorded in the audit_log table.
 * Account-level events (LOGIN, LOGOUT, etc.) have no associated credential.
 * Credential-level events (VIEW, CREATE, UPDATE, DELETE) always reference a credential.
 */
public enum AuditAction {
    // Credential-level events
    VIEW,
    CREATE,
    UPDATE,
    DELETE,

    // Account-level events
    LOGIN,
    LOGOUT,
    LOGIN_FAILED,
    PASSWORD_CHANGED
}
