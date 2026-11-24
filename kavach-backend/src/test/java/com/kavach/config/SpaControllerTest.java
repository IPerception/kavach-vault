package com.kavach.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SpaControllerTest {

    private static final Pattern CSP_NONCE = Pattern.compile("style-src 'self' 'nonce-([^']+)'");
    private static final Pattern META_NONCE =
            Pattern.compile("<meta name=\"csp-nonce\" content=\"([^\"]*)\"");

    @Autowired
    MockMvc mockMvc;

    private static String find(Pattern pattern, String text) {
        Matcher m = pattern.matcher(text);
        assertThat(m.find()).as("%s in %s", pattern, text).isTrue();
        return m.group(1);
    }

    private void assertServesPageWithNonce(String path) throws Exception {
        MvcResult result = mockMvc.perform(get(path)).andReturn();
        var response = result.getResponse();
        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getContentType()).startsWith("text/html");
        assertThat(response.getCharacterEncoding()).isEqualToIgnoringCase("UTF-8");
        assertThat(response.getHeader("Cache-Control")).contains("no-store");

        String headerNonce = find(CSP_NONCE, response.getHeader("Content-Security-Policy"));
        String metaNonce = find(META_NONCE, response.getContentAsString());
        assertThat(metaNonce).isNotEqualTo("__CSP_NONCE__").isEqualTo(headerNonce);
    }

    @Test
    void root_servesPageWithMatchingNonce() throws Exception {
        assertServesPageWithNonce("/");
    }

    @Test
    void indexHtml_servesPageWithMatchingNonce() throws Exception {
        assertServesPageWithNonce("/index.html");
    }

    @Test
    void spaRoutes_servePageWithMatchingNonce() throws Exception {
        assertServesPageWithNonce("/dashboard");
        assertServesPageWithNonce("/edit/42");
    }

    @Test
    void eachRequestGetsAFreshNonce() throws Exception {
        String first = find(META_NONCE, mockMvc.perform(get("/")).andReturn().getResponse().getContentAsString());
        String second = find(META_NONCE, mockMvc.perform(get("/")).andReturn().getResponse().getContentAsString());
        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void apiPaths_areNotServedBySpaController() throws Exception {
        var response = mockMvc.perform(get("/api/does-not-exist")).andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain("csp-nonce");
    }

    @Test
    void staticAssets_areNotServedBySpaController() throws Exception {
        var response = mockMvc.perform(get("/assets/x.js")).andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain("csp-nonce");
    }
}
