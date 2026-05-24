package com.kavach.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kavach.auth.JwtService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.dto.request.ChangePasswordRequest;
import com.kavach.dto.request.LoginRequest;
import com.kavach.dto.request.RegisterRequest;
import com.kavach.repository.AuditLogRepository;
import com.kavach.repository.CredentialRepository;
import com.kavach.repository.VaultUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.servlet.http.Cookie;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static com.kavach.TestConstants.VALID_PASSWORD;
import static com.kavach.TestConstants.VALID_NEW_PASSWORD;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired VaultUserRepository userRepository;
    @Autowired AuditLogRepository auditLogRepository;
    @Autowired CredentialRepository credentialRepository;
    @Autowired SessionKeyStore sessionKeyStore;
    @Autowired JwtService jwtService;

    @BeforeEach
    void setUp() {
        sessionKeyStore.clear();
        auditLogRepository.deleteAllInBatch();
        credentialRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Test
    void register_validRequest_returns201() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RegisterRequest("alice", "alice@example.com", VALID_PASSWORD))))
                .andExpect(status().isCreated());
    }

    @Test
    void register_blankUsername_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RegisterRequest("", "alice@example.com", VALID_PASSWORD))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_passwordTooShort_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RegisterRequest("alice", "alice@example.com", "short"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_whenVaultAlreadyExists_returns409() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RegisterRequest("alice", "alice@example.com", VALID_PASSWORD))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RegisterRequest("bob", "bob@example.com", VALID_PASSWORD))))
                .andExpect(status().isConflict());
    }

    @Test
    void login_validCredentials_returns200WithJwtCookie() throws Exception {
        register("alice", VALID_PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new LoginRequest("alice", VALID_PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Set-Cookie", containsString("kavach-token")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")));
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        register("alice", VALID_PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new LoginRequest("alice", "WrongPassword!"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_returns200AndSetsExpiredCookie() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("kavach-token=")))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    @Test
    void protectedEndpoint_withoutJwt_returns401() throws Exception {
        mockMvc.perform(get("/api/credentials"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void vaultStatus_whenNotInitialized_returnsFalse() throws Exception {
        mockMvc.perform(get("/api/auth/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initialized").value(false));
    }

    @Test
    void vaultStatus_whenInitialized_returnsTrue() throws Exception {
        register("alice", VALID_PASSWORD);
        mockMvc.perform(get("/api/auth/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initialized").value(true));
    }

    @Test
    void changePassword_validRequest_returns200() throws Exception {
        register("alice", VALID_PASSWORD);
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new LoginRequest("alice", VALID_PASSWORD))))
                .andExpect(status().isOk());

        Cookie jwtCookie = new Cookie(JwtService.COOKIE_NAME, jwtService.generateToken("alice"));

        mockMvc.perform(put("/api/auth/change-password")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new ChangePasswordRequest(VALID_PASSWORD, VALID_NEW_PASSWORD))))
                .andExpect(status().isOk());
    }

    @Test
    void changePassword_wrongCurrentPassword_returns401() throws Exception {
        register("alice", VALID_PASSWORD);
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new LoginRequest("alice", VALID_PASSWORD))))
                .andExpect(status().isOk());

        Cookie jwtCookie = new Cookie(JwtService.COOKIE_NAME, jwtService.generateToken("alice"));

        mockMvc.perform(put("/api/auth/change-password")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new ChangePasswordRequest("WrongPass!", VALID_NEW_PASSWORD))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void changePassword_withoutJwt_returns401() throws Exception {
        mockMvc.perform(put("/api/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new ChangePasswordRequest(VALID_PASSWORD, VALID_NEW_PASSWORD))))
                .andExpect(status().isUnauthorized());
    }

    private void register(String username, String password) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RegisterRequest(username, username + "@example.com", password))))
                .andExpect(status().isCreated());
    }

    private String json(Object obj) throws Exception {
        return objectMapper.writeValueAsString(obj);
    }
}
