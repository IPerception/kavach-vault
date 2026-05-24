package com.kavach.config;

import org.hibernate.community.dialect.SQLiteDialect;
import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.exception.spi.SQLExceptionConversionDelegate;

/**
 * Extends the Hibernate community SQLiteDialect to fix exception translation.
 *
 * Problem: SQLite throws error code 19 (SQLITE_CONSTRAINT) for all constraint
 * violations (UNIQUE, FK, NOT NULL). The community dialect's default conversion
 * delegate does not map this code to Hibernate's ConstraintViolationException.
 * Instead it falls through to GenericJDBCException, which Spring translates to
 * JpaSystemException rather than DataIntegrityViolationException.
 *
 * Fix: intercept error code 19 and return ConstraintViolationException so that
 * Spring's HibernateJpaDialect correctly produces DataIntegrityViolationException.
 * Service-layer code that catches DataIntegrityViolationException (e.g. duplicate
 * credential purpose -> 409 Conflict) will then work as expected.
 */
public class KavachSQLiteDialect extends SQLiteDialect {

    // SQLite error code for all constraint violations (UNIQUE, FK, NOT NULL, CHECK)
    private static final int SQLITE_CONSTRAINT = 19;

    @Override
    public SQLExceptionConversionDelegate buildSQLExceptionConversionDelegate() {
        return (sqlException, message, sql) -> {
            if (sqlException.getErrorCode() == SQLITE_CONSTRAINT) {
                return new ConstraintViolationException(message, sqlException, sql, extractConstraintName(message));
            }
            // Return null to fall through to the default delegate for all other codes.
            return null;
        };
    }

    private String extractConstraintName(String message) {
        // SQLite error message format: "UNIQUE constraint failed: table.column"
        // or "FOREIGN KEY constraint failed"
        if (message != null && message.contains("constraint failed: ")) {
            return message.substring(message.indexOf("constraint failed: ") + "constraint failed: ".length()).trim();
        }
        return null;
    }
}
