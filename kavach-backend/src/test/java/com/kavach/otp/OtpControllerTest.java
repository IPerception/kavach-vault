package com.kavach.otp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kavach.auth.JwtService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.dto.request.CreateCredentialRequest;
import com.kavach.dto.request.LoginRequest;
import com.kavach.dto.request.RegisterRequest;
import com.kavach.dto.request.RevealRequest;
import com.kavach.dto.request.TotpConfirmRequest;
import com.kavach.repository.AuditLogRepository;
import com.kavach.repository.CredentialRepository;
import com.kavach.repository.VaultUserRepository;
import com.kavach.totp.TotpProvider;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static com.kavach.TestConstants.VALID_PASSWORD;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OtpControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired VaultUserRepository userRepository;
    @Autowired AuditLogRepository auditLogRepository;
    @Autowired CredentialRepository credentialRepository;
    @Autowired SessionKeyStore sessionKeyStore;
    @Autowired JwtService jwtService;
    @MockBean TotpProvider totpProvider;

    private Cookie jwtCookie;
    private long credentialId;

    @BeforeEach
    void setUp() throws Exception {
        sessionKeyStore.clear();
        auditLogRepository.deleteAllInBatch();
        credentialRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        when(totpProvider.generateSecret()).thenReturn("JBSWY3DPEHPK3PXP");
        when(totpProvider.getQrCodeUri(any(), any(), any())).thenReturn("otpauth://totp/test");
        when(totpProvider.isValidCode(any(), eq("123456"))).thenReturn(true);
        when(totpProvider.isValidCode(any(), eq("000000"))).thenReturn(false);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RegisterRequest("alice", "alice@example.com", VALID_PASSWORD))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new LoginRequest("alice", VALID_PASSWORD))))
                .andExpect(status().isOk());

        jwtCookie = new Cookie(JwtService.COOKIE_NAME, jwtService.generateToken("alice"));

        mockMvc.perform(post("/api/auth/totp/setup").cookie(jwtCookie))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/totp/confirm")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new TotpConfirmRequest("123456"))))
                .andExpect(status().isOk());

        MvcResult createResult = mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "gmailPw1!", "", "", null))))
                .andExpect(status().isCreated())
                .andReturn();

        credentialId = extractIdFromLocation(createResult.getResponse().getHeader("Location"));
    }

    @Test
    void reveal_validTotpCode_returns200WithPassword() throws Exception {
        mockMvc.perform(post("/api/credentials/" + credentialId + "/reveal")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RevealRequest("123456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.password").value("gmailPw1!"));
    }

    @Test
    void reveal_invalidTotpCode_returns401() throws Exception {
        mockMvc.perform(post("/api/credentials/" + credentialId + "/reveal")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RevealRequest("000000"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reveal_credentialNotFound_returns404() throws Exception {
        mockMvc.perform(post("/api/credentials/9999/reveal")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RevealRequest("123456"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void reveal_withoutJwt_returns401() throws Exception {
        mockMvc.perform(post("/api/credentials/" + credentialId + "/reveal")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RevealRequest("123456"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reveal_blankCode_returns400() throws Exception {
        mockMvc.perform(post("/api/credentials/" + credentialId + "/reveal")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RevealRequest(""))))
                .andExpect(status().isBadRequest());
    }

    private String json(Object obj) throws Exception {
        return objectMapper.writeValueAsString(obj);
    }

    private long extractIdFromLocation(String location) {
        if (location == null) return -1;
        return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
    }
}
