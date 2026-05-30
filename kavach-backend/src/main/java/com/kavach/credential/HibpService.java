package com.kavach.credential;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class HibpService {

    private final HttpClient httpClient;

    public HibpService() {
        this(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build());
    }

    HibpService(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    /**
     * Returns how many times this password appeared in known data breaches,
     * or 0 if it was not found. Uses the k-anonymity range API so the full
     * password (or its hash) is never transmitted.
     */
    public int countBreaches(byte[] passwordBytes) {
        String sha1 = sha1Hex(passwordBytes);
        String prefix = sha1.substring(0, 5).toUpperCase(Locale.ROOT);
        String suffix = sha1.substring(5).toUpperCase(Locale.ROOT);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.pwnedpasswords.com/range/" + prefix))
                .header("User-Agent", "Kavach-PasswordManager")
                .header("Add-Padding", "true")
                .timeout(Duration.ofSeconds(8))
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return 0;
            }
            for (String line : response.body().split("\r?\n")) {
                int colonIdx = line.indexOf(':');
                if (colonIdx < 0) continue;
                String lineSuffix = line.substring(0, colonIdx).trim().toUpperCase(Locale.ROOT);
                if (lineSuffix.equals(suffix)) {
                    String countStr = line.substring(colonIdx + 1).trim();
                    try {
                        return Integer.parseInt(countStr);
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                }
            }
            return 0;
        } catch (Exception e) {
            return 0;
        }
    }

    private String sha1Hex(byte[] input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-1").digest(input);
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-1 unavailable", e);
        }
    }
}
