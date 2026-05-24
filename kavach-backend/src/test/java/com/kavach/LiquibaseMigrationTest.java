package com.kavach;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the Liquibase migration scripts produce the correct schema.
 * Uses a separate DB file and enables Liquibase (overriding the test profile defaults)
 * so this test exercises the actual SQL changelogs, not JPA auto-DDL.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        // Separate DB file so this context's Liquibase run doesn't interfere with other tests.
        // Liquibase's incremental design means repeated runs are safe: already-applied
        // changesets are skipped, so the final schema is identical whether the DB is
        // fresh or was migrated incrementally across multiple test runs.
        "spring.datasource.url=jdbc:sqlite:./target/kavach-migration-test.db"
})
class LiquibaseMigrationTest {

    @Autowired
    DataSource dataSource;

    @Test
    void allFourTablesAreCreatedByMigration() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            assertTableExists(conn, "vault_user");
            assertTableExists(conn, "credential");
            assertTableExists(conn, "audit_log");
            assertTableExists(conn, "app_config");
        }
    }

    @Test
    void vaultUser_hasExpectedColumns() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            assertColumnExists(conn, "vault_user", "id");
            assertColumnExists(conn, "vault_user", "username");
            assertColumnExists(conn, "vault_user", "master_password_hash");
            assertColumnExists(conn, "vault_user", "pbkdf2_salt");
            assertColumnExists(conn, "vault_user", "email");
            assertColumnExists(conn, "vault_user", "created_at");
        }
    }

    @Test
    void credential_hasExpectedColumns() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            assertColumnExists(conn, "credential", "id");
            assertColumnExists(conn, "credential", "user_id");
            assertColumnExists(conn, "credential", "purpose");
            assertColumnExists(conn, "credential", "username");
            assertColumnExists(conn, "credential", "encrypted_password");
            assertColumnExists(conn, "credential", "dek_encrypted");
            assertColumnExists(conn, "credential", "created_at");
            assertColumnExists(conn, "credential", "updated_at");
        }
    }

    private void assertTableExists(Connection conn, String tableName) throws Exception {
        try (ResultSet rs = conn.getMetaData().getTables(null, null, tableName, new String[]{"TABLE"})) {
            assertThat(rs.next())
                    .as("Table '%s' should exist after Liquibase migration", tableName)
                    .isTrue();
        }
    }

    private void assertColumnExists(Connection conn, String tableName, String columnName) throws Exception {
        try (ResultSet rs = conn.getMetaData().getColumns(null, null, tableName, columnName)) {
            assertThat(rs.next())
                    .as("Column '%s.%s' should exist", tableName, columnName)
                    .isTrue();
        }
    }
}
