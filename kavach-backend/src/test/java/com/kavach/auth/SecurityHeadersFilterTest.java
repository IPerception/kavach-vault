package com.kavach.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityHeadersFilterTest {

    private MockHttpServletResponse response;
    private MockFilterChain chain;

    @BeforeEach
    void runFilter() throws Exception {
        response = new MockHttpServletResponse();
        chain = new MockFilterChain();
        new SecurityHeadersFilter().doFilter(new MockHttpServletRequest("GET", "/"), response, chain);
    }

    private List<String> cspDirectives() {
        return Arrays.stream(response.getHeader("Content-Security-Policy").split(";"))
                .map(String::trim)
                .toList();
    }

    @Test
    void setsFrameAndContentTypeHeaders() {
        assertThat(response.getHeader("X-Frame-Options")).isEqualTo("DENY");
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
    }

    @Test
    void cspKeepsEverythingElseSameOrigin() {
        assertThat(cspDirectives()).contains("default-src 'self'");
    }

    @Test
    void cspAllowsTheUpdateCheckToReachGitHubOnly() {
        assertThat(cspDirectives()).contains("connect-src 'self' https://api.github.com");
    }

    @Test
    void cspNeverAllowsEvalOrInlineScript() {
        String csp = response.getHeader("Content-Security-Policy");
        assertThat(csp).doesNotContain("unsafe-eval").doesNotContain("unsafe-inline");
    }

    @Test
    void passesTheRequestOn() {
        assertThat(chain.getRequest()).isNotNull();
    }
}
