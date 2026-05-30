package com.kavach.credential;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kavach.auth.JwtService;
import com.kavach.crypto.SessionKeyStore;
import com.kavach.dto.request.CreateCredentialRequest;
import com.kavach.dto.request.LoginRequest;
import com.kavach.dto.request.RegisterRequest;
import com.kavach.dto.request.UpdateCredentialRequest;
import com.kavach.repository.AuditLogRepository;
import com.kavach.repository.CredentialRepository;
import com.kavach.repository.VaultUserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static com.kavach.TestConstants.VALID_PASSWORD;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CredentialControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired VaultUserRepository userRepository;
    @Autowired AuditLogRepository auditLogRepository;
    @Autowired CredentialRepository credentialRepository;
    @Autowired SessionKeyStore sessionKeyStore;
    @Autowired JwtService jwtService;

    private Cookie jwtCookie;

    @BeforeEach
    void setUp() throws Exception {
        sessionKeyStore.clear();
        auditLogRepository.deleteAllInBatch();
        credentialRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new RegisterRequest("alice", "alice@example.com", VALID_PASSWORD))))
                .andExpect(status().isCreated());

        // Login to load the master key into SessionKeyStore (required for encryption)
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new LoginRequest("alice", VALID_PASSWORD))))
                .andExpect(status().isOk());

        // Generate token directly — avoids parsing the Set-Cookie header in tests
        jwtCookie = new Cookie(JwtService.COOKIE_NAME, jwtService.generateToken("alice"));
    }

    @Test
    void createCredential_validRequest_returns201WithLocation() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "gmailPw1!", "", "", null))))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/credentials/")));
    }

    @Test
    void createCredential_blankPurpose_returns400() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("", "alice", "pw", "", "", null))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createCredential_duplicatePurpose_returns409() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "pw1", "", "", null))));

        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "other@gmail.com", "pw2", "", "", null))))
                .andExpect(status().isConflict());
    }

    @Test
    void createCredential_withoutJwt_returns401() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice", "pw", "", "", null))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listCredentials_returnsAllCreated() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "pw1", "", "", null))));
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("GitHub", "alice", "pw2", "", "", null))));

        mockMvc.perform(get("/api/credentials").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].purpose", containsInAnyOrder("Gmail", "GitHub")));
    }

    @Test
    void listCredentials_emptyVault_returnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/credentials").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listCredentials_withoutJwt_returns401() throws Exception {
        mockMvc.perform(get("/api/credentials"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listCredentials_responseDoesNotContainEncryptedFields() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "secret", "", "", null))));

        mockMvc.perform(get("/api/credentials").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].encryptedPassword").doesNotExist())
                .andExpect(jsonPath("$[0].dekEncrypted").doesNotExist());
    }

    @Test
    void updateCredential_validRequest_returns200() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "oldPw", "", "", null))))
                .andReturn();

        long id = extractIdFromLocation(createResult.getResponse().getHeader("Location"));

        mockMvc.perform(put("/api/credentials/" + id)
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new UpdateCredentialRequest("alice_new@gmail.com", "newPw1!", "", "", null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice_new@gmail.com"));
    }

    @Test
    void updateCredential_notFound_returns404() throws Exception {
        mockMvc.perform(put("/api/credentials/9999")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new UpdateCredentialRequest("u", "p", "", "", null))))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateCredential_withoutJwt_returns401() throws Exception {
        mockMvc.perform(put("/api/credentials/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new UpdateCredentialRequest("u", "p", "", "", null))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteCredential_validId_returns204() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "pw", "", "", null))))
                .andReturn();

        long id = extractIdFromLocation(createResult.getResponse().getHeader("Location"));

        mockMvc.perform(delete("/api/credentials/" + id).cookie(jwtCookie))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/credentials").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void deleteCredential_notFound_returns404() throws Exception {
        mockMvc.perform(delete("/api/credentials/9999").cookie(jwtCookie))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteCredential_withoutJwt_returns401() throws Exception {
        mockMvc.perform(delete("/api/credentials/1"))
                .andExpect(status().isUnauthorized());
    }

    // --- GET /api/credentials/export ---

    @Test
    void export_withoutJwt_returns401() throws Exception {
        mockMvc.perform(get("/api/credentials/export"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void export_emptyVault_returnsVersionOneAndNonNullData() throws Exception {
        mockMvc.perform(get("/api/credentials/export").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.data").isString());
    }

    @Test
    void export_singleCredential_returnsEncryptedBlob() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "secret1!", "", "", null))));

        mockMvc.perform(get("/api/credentials/export").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.data").isString());
    }

    // --- POST /api/credentials/import ---

    @Test
    void import_withoutJwt_returns401() throws Exception {
        mockMvc.perform(post("/api/credentials/import")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":1,\"data\":\"abc\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void import_roundTrip_restoresDeletedCredentials() throws Exception {
        // create a credential
        MvcResult createResult = mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "Passw0rd!", "", "", null))))
                .andReturn();
        long id = extractIdFromLocation(createResult.getResponse().getHeader("Location"));

        // export
        MvcResult exportResult = mockMvc.perform(get("/api/credentials/export").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andReturn();
        String exportBody = exportResult.getResponse().getContentAsString();

        // delete the credential
        mockMvc.perform(delete("/api/credentials/" + id).cookie(jwtCookie))
                .andExpect(status().isNoContent());

        // import
        mockMvc.perform(post("/api/credentials/import")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(exportBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(1))
                .andExpect(jsonPath("$.skipped").value(0));

        // verify credential is back
        mockMvc.perform(get("/api/credentials").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].purpose").value("Gmail"));
    }

    @Test
    void import_duplicateCredentials_skipsExisting() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "Passw0rd!", "", "", null))));

        MvcResult exportResult = mockMvc.perform(get("/api/credentials/export").cookie(jwtCookie))
                .andReturn();
        String exportBody = exportResult.getResponse().getContentAsString();

        // import while Gmail still exists — should skip
        mockMvc.perform(post("/api/credentials/import")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(exportBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(0))
                .andExpect(jsonPath("$.skipped").value(1));
    }

    @Test
    void import_invalidBase64_returns400() throws Exception {
        mockMvc.perform(post("/api/credentials/import")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":1,\"data\":\"not-valid-base64!!!\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void import_unsupportedVersion_returns400() throws Exception {
        mockMvc.perform(post("/api/credentials/import")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":99,\"data\":\"abc\"}"))
                .andExpect(status().isBadRequest());
    }

    // --- GET /api/credentials/health ---

    @Test
    void healthReport_withoutJwt_returns401() throws Exception {
        mockMvc.perform(get("/api/credentials/health"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthReport_emptyVault_returnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/credentials/health").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void healthReport_singleCredential_returnsStrengthAndDuplicateFields() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "pw", "", "", null))));

        mockMvc.perform(get("/api/credentials/health").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].purpose").value("Gmail"))
                .andExpect(jsonPath("$[0].strengthScore").isNumber())
                .andExpect(jsonPath("$[0].strengthLabel").isString())
                .andExpect(jsonPath("$[0].duplicate").value(false))
                .andExpect(jsonPath("$[0].updatedAt").isString());
    }

    @Test
    void healthReport_responseDoesNotContainPassword() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "secret", "", "", null))));

        mockMvc.perform(get("/api/credentials/health").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].password").doesNotExist())
                .andExpect(jsonPath("$[0].encryptedPassword").doesNotExist());
    }

    @Test
    void healthReport_twoCredentialsWithSamePassword_bothMarkedDuplicate() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "samePass1!", "", "", null))));
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("GitHub", "alice", "samePass1!", "", "", null))));

        mockMvc.perform(get("/api/credentials/health").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].duplicate").value(true))
                .andExpect(jsonPath("$[1].duplicate").value(true));
    }

    @Test
    void healthReport_twoCredentialsWithDifferentPasswords_neitherMarkedDuplicate() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "passA1!", "", "", null))));
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("GitHub", "alice", "passB2@", "", "", null))));

        mockMvc.perform(get("/api/credentials/health").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].duplicate").value(false))
                .andExpect(jsonPath("$[1].duplicate").value(false));
    }

    @Test
    void healthReport_strongPassword_scoreIsFour() throws Exception {
        mockMvc.perform(post("/api/credentials")
                .cookie(jwtCookie).contentType(MediaType.APPLICATION_JSON)
                .content(json(new CreateCredentialRequest("Gmail", "alice@gmail.com", "Str0ng!Pass#1", "", "", null))));

        mockMvc.perform(get("/api/credentials/health").cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].strengthScore").value(4))
                .andExpect(jsonPath("$[0].strengthLabel").value("Very Strong"));
    }

    private String json(Object obj) throws Exception {
        return objectMapper.writeValueAsString(obj);
    }

    private long extractIdFromLocation(String location) {
        if (location == null) return -1;
        return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
    }
}
