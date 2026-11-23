package com.kavach;

import liquibase.analytics.configuration.AnalyticsArgs;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards against Liquibase usage analytics being re-enabled. Kavach is local-first;
 * Liquibase OSS >= 4.30 phones home on every migration run unless told not to.
 *
 * Reads Liquibase's own resolved setting (not just the raw system property), so it
 * also fails if Liquibase renames the key. It deliberately avoids
 * AnalyticsArgs.isAnalyticsEnabled(), which may fetch remote config over the network.
 */
class LiquibaseAnalyticsDisabledTest {

    @Test
    void loadingTheApplicationClassDisablesLiquibaseAnalytics() throws Exception {
        // Trigger KavachApplication's static initializer, as Spring Boot does.
        Class.forName(KavachApplication.class.getName());

        assertThat(System.getProperty("liquibase.analytics.enabled")).isEqualTo("false");
        assertThat(AnalyticsArgs.ENABLED.getCurrentValue()).isFalse();
    }
}
