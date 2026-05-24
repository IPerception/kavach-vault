package com.kavach.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void authEndpoints_areAccessibleWithoutToken() throws Exception {
        // /api/auth/** is public — security must not block with 401.
        // No handler exists in Phase 1, so we expect 4xx but NOT 401.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(result ->
                        assertThat(result.getResponse().getStatus())
                                .isNotEqualTo(HttpStatus.UNAUTHORIZED.value()));
    }

    @Test
    void protectedEndpoints_return401_withoutToken() throws Exception {
        mockMvc.perform(get("/api/credentials"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void swaggerUi_isAccessibleWithoutToken() throws Exception {
        // Swagger UI is allowed in dev for API exploration.
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(result ->
                        assertThat(result.getResponse().getStatus())
                                .isNotEqualTo(HttpStatus.UNAUTHORIZED.value()));
    }
}
