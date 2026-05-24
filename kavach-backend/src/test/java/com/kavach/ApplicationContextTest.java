package com.kavach;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class ApplicationContextTest {

    @Test
    void contextLoads() {
        // Verifies that the Spring application context starts without errors.
        // Covers: datasource wiring, security config, JPA config, Liquibase config.
    }
}
