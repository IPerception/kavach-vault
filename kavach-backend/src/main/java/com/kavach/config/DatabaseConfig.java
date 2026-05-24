package com.kavach.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Configuration
public class DatabaseConfig {

    private final DataSource dataSource;

    public DatabaseConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Applies critical SQLite PRAGMAs on every application startup.
     *
     * PRAGMA is a SQLite-specific directive that configures database engine behavior
     * at runtime. Unlike regular SQL, PRAGMAs are not persisted in the database file
     * and must be re-applied on each new connection.
     *
     * journal_mode=WAL (Write-Ahead Log):
     *   SQLite's default journal mode is "DELETE" — it locks the entire file during
     *   writes, blocking all readers. WAL mode separates reads from writes: readers
     *   see a consistent snapshot from the WAL file while a writer appends changes.
     *   This prevents the "database is locked" errors that occur under concurrent
     *   access and improves throughput for a local app that may have multiple
     *   open connections (e.g., app + Liquibase startup).
     *
     * foreign_keys=ON:
     *   SQLite does NOT enforce foreign key constraints by default (for backwards
     *   compatibility). This PRAGMA enables enforcement so that referential integrity
     *   violations (e.g., inserting a credential with a non-existent user_id) are
     *   caught at the database level, not just application level.
     *
     * With HikariCP pool-size=1, one connection handles all DB access, so running
     * these PRAGMAs once at startup on that single connection is sufficient.
     */
    @PostConstruct
    public void applyPragmas() throws SQLException {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("PRAGMA journal_mode=WAL");
            stmt.execute("PRAGMA foreign_keys=ON");
        }
    }
}
