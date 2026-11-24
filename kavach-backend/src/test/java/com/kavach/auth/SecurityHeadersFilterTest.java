package com.kavach.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    private static List<String> directives(MockHttpServletResponse res) {
        return Arrays.stream(res.getHeader("Content-Security-Policy").split(";"))
                .map(String::trim)
                .toList();
    }

    private List<String> cspDirectives() {
        return directives(response);
    }

    private static String styleNonce(MockHttpServletResponse res) {
        String style = directives(res).stream()
                .filter(d -> d.startsWith("style-src "))
                .findFirst().orElseThrow();
        Matcher m = Pattern.compile("'nonce-([^']+)'").matcher(style);
        assertThat(m.find()).isTrue();
        return m.group(1);
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
    void styleSrcCarriesANonce() {
        String nonce = styleNonce(response);
        assertThat(cspDirectives()).contains("style-src 'self' 'nonce-" + nonce + "'");
        assertThat(Base64.getDecoder().decode(nonce)).hasSize(16);
    }

    @Test
    void eachRequestGetsADifferentNonce() throws Exception {
        MockHttpServletResponse other = new MockHttpServletResponse();
        new SecurityHeadersFilter().doFilter(new MockHttpServletRequest("GET", "/"), other, new MockFilterChain());
        assertThat(styleNonce(other)).isNotEqualTo(styleNonce(response));
    }

    @Test
    void requestAttributeMatchesTheHeaderNonce() {
        assertThat((String) chain.getRequest().getAttribute(SecurityHeadersFilter.NONCE_ATTRIBUTE))
                .isEqualTo(styleNonce(response));
    }

    @Test
    void nonceAppearsOnlyInStyleSrc() {
        String nonce = styleNonce(response);
        assertThat(cspDirectives().stream().filter(d -> d.contains(nonce)).toList()).hasSize(1);
        assertThat(cspDirectives()).noneMatch(d -> d.startsWith("script-src"));
    }

    @Test
    void passesTheRequestOn() {
        assertThat(chain.getRequest()).isNotNull();
    }
}
