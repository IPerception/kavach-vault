package com.kavach.credential;

import com.kavach.dto.ImportResult;
import com.kavach.dto.request.CreateCredentialRequest;
import com.kavach.exception.DuplicateCredentialException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

@Service
public class CsvImportService {

    private static final Set<String> CHROME_REQUIRED = Set.of("name", "url", "username", "password");
    private static final Set<String> LASTPASS_REQUIRED = Set.of("url", "username", "password", "extra", "name", "grouping", "fav");
    private static final Set<String> BITWARDEN_REQUIRED = Set.of("folder", "favorite", "type", "name", "notes", "login_uri", "login_username", "login_password");

    private final CredentialService credentialService;

    public CsvImportService(CredentialService credentialService) {
        this.credentialService = credentialService;
    }

    public ImportResult importCsv(MultipartFile file, String username) {
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            Set<String> headers = parser.getHeaderNames().stream()
                    .map(String::toLowerCase)
                    .collect(java.util.stream.Collectors.toSet());

            CsvFormat format = detectFormat(headers);

            int imported = 0, skipped = 0;
            for (CSVRecord record : parser) {
                CreateCredentialRequest req = mapRecord(record, format);
                if (req == null) {
                    skipped++;
                    continue;
                }
                try {
                    credentialService.create(req, username);
                    imported++;
                } catch (DuplicateCredentialException | DataIntegrityViolationException e) {
                    skipped++;
                }
            }
            return ImportResult.builder().imported(imported).skipped(skipped).build();

        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read CSV file");
        }
    }

    private CsvFormat detectFormat(Set<String> headers) {
        if (headers.containsAll(BITWARDEN_REQUIRED)) return CsvFormat.BITWARDEN;
        if (headers.containsAll(LASTPASS_REQUIRED)) return CsvFormat.LASTPASS;
        if (headers.containsAll(CHROME_REQUIRED)) return CsvFormat.CHROME;
        throw new IllegalArgumentException(
                "Unrecognized CSV format. Supported formats: Chrome Passwords, LastPass, Bitwarden.");
    }

    private CreateCredentialRequest mapRecord(CSVRecord record, CsvFormat format) {
        return switch (format) {
            case CHROME -> mapChrome(record);
            case LASTPASS -> mapLastPass(record);
            case BITWARDEN -> mapBitwarden(record);
        };
    }

    private CreateCredentialRequest mapChrome(CSVRecord record) {
        String purpose = get(record, "name");
        String password = get(record, "password");
        if (purpose.isBlank() || password.isBlank()) return null;
        return new CreateCredentialRequest(purpose, get(record, "username"), password, get(record, "url"), null, List.of());
    }

    private CreateCredentialRequest mapLastPass(CSVRecord record) {
        String purpose = get(record, "name");
        String password = get(record, "password");
        if (purpose.isBlank() || password.isBlank()) return null;
        String grouping = get(record, "grouping");
        List<String> tags = grouping.isBlank() ? List.of() : List.of(grouping);
        return new CreateCredentialRequest(purpose, get(record, "username"), password,
                get(record, "url"), get(record, "extra"), tags);
    }

    private CreateCredentialRequest mapBitwarden(CSVRecord record) {
        if (!"login".equalsIgnoreCase(get(record, "type"))) return null;
        String purpose = get(record, "name");
        String password = get(record, "login_password");
        if (purpose.isBlank() || password.isBlank()) return null;
        String folder = get(record, "folder");
        List<String> tags = folder.isBlank() ? List.of() : List.of(folder);
        return new CreateCredentialRequest(purpose, get(record, "login_username"), password,
                get(record, "login_uri"), get(record, "notes"), tags);
    }

    private String get(CSVRecord record, String header) {
        try {
            String value = record.get(header);
            return value != null ? value : "";
        } catch (IllegalArgumentException e) {
            return "";
        }
    }

    private enum CsvFormat { CHROME, LASTPASS, BITWARDEN }
}
