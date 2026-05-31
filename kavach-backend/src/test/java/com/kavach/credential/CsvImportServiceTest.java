package com.kavach.credential;

import com.kavach.dto.ImportResult;
import com.kavach.dto.request.CreateCredentialRequest;
import com.kavach.exception.DuplicateCredentialException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CsvImportServiceTest {

    @Mock CredentialService credentialService;

    CsvImportService service;

    @BeforeEach
    void setUp() {
        service = new CsvImportService(credentialService);
    }

    @Test
    void chrome_imports_password_row() throws Exception {
        String csv = "name,url,username,password\nGitHub,https://github.com,alice,secret123\n";
        MockMultipartFile file = csv("chrome.csv", csv);

        ImportResult result = service.importCsv(file, "alice");

        assertThat(result.getImported()).isEqualTo(1);
        assertThat(result.getSkipped()).isEqualTo(0);
        ArgumentCaptor<CreateCredentialRequest> cap = ArgumentCaptor.forClass(CreateCredentialRequest.class);
        verify(credentialService).create(cap.capture(), eq("alice"));
        CreateCredentialRequest req = cap.getValue();
        assertThat(req.getPurpose()).isEqualTo("GitHub");
        assertThat(req.getUsername()).isEqualTo("alice");
        assertThat(req.getPassword()).isEqualTo("secret123");
        assertThat(req.getUrl()).isEqualTo("https://github.com");
    }

    @Test
    void chrome_skips_row_with_blank_password() {
        String csv = "name,url,username,password\nGitHub,https://github.com,alice,\n";
        ImportResult result = service.importCsv(csv("chrome.csv", csv), "alice");

        assertThat(result.getImported()).isEqualTo(0);
        assertThat(result.getSkipped()).isEqualTo(1);
        verifyNoInteractions(credentialService);
    }

    @Test
    void lastpass_maps_extra_as_notes_and_grouping_as_tag() {
        String csv = "url,username,password,extra,name,grouping,fav\n"
                + "https://example.com,bob,pass1,my note,Example,work,0\n";
        ImportResult result = service.importCsv(csv("lastpass.csv", csv), "bob");

        assertThat(result.getImported()).isEqualTo(1);
        ArgumentCaptor<CreateCredentialRequest> cap = ArgumentCaptor.forClass(CreateCredentialRequest.class);
        verify(credentialService).create(cap.capture(), eq("bob"));
        CreateCredentialRequest req = cap.getValue();
        assertThat(req.getNotes()).isEqualTo("my note");
        assertThat(req.getTags()).containsExactly("work");
    }

    @Test
    void bitwarden_imports_login_type_only() {
        String csv = "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n"
                + "work,0,login,GitHub,,,,https://github.com,alice,secret123,\n"
                + "work,0,card,Visa,,,0,,,,\n";
        ImportResult result = service.importCsv(csv("bitwarden.csv", csv), "alice");

        assertThat(result.getImported()).isEqualTo(1);
        assertThat(result.getSkipped()).isEqualTo(1);
    }

    @Test
    void bitwarden_maps_folder_as_tag() {
        String csv = "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n"
                + "personal,0,login,Google,,,,https://google.com,alice,mypass,\n";
        ImportResult result = service.importCsv(csv("bitwarden.csv", csv), "alice");

        ArgumentCaptor<CreateCredentialRequest> cap = ArgumentCaptor.forClass(CreateCredentialRequest.class);
        verify(credentialService).create(cap.capture(), any());
        assertThat(cap.getValue().getTags()).containsExactly("personal");
    }

    @Test
    void duplicate_credential_is_counted_as_skipped() {
        String csv = "name,url,username,password\nGitHub,https://github.com,alice,secret123\n";
        doThrow(new DuplicateCredentialException("GitHub"))
                .when(credentialService).create(any(), any());

        ImportResult result = service.importCsv(csv("chrome.csv", csv), "alice");

        assertThat(result.getImported()).isEqualTo(0);
        assertThat(result.getSkipped()).isEqualTo(1);
    }

    @Test
    void unrecognized_format_throws_illegal_argument() {
        String csv = "col1,col2\nfoo,bar\n";
        assertThatThrownBy(() -> service.importCsv(csv("unknown.csv", csv), "alice"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unrecognized CSV format");
    }

    @Test
    void multiple_rows_tallied_correctly() {
        String csv = "name,url,username,password\n"
                + "GitHub,https://github.com,alice,s3cret\n"
                + "Gmail,https://mail.google.com,alice,p@ssw0rd\n"
                + "Empty,,alice,\n";
        ImportResult result = service.importCsv(csv("chrome.csv", csv), "alice");

        assertThat(result.getImported()).isEqualTo(2);
        assertThat(result.getSkipped()).isEqualTo(1);
    }

    private MockMultipartFile csv(String filename, String content) {
        return new MockMultipartFile("file", filename, "text/csv",
                content.getBytes(StandardCharsets.UTF_8));
    }
}
