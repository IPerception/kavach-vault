package com.kavach.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class CertificateService {

    private static final Logger log = LoggerFactory.getLogger(CertificateService.class);
    public static final String KEYSTORE_FILENAME = "kavach.p12";
    public static final String PASSWORD_FILENAME = "tls.key";
    public static final String KEY_ALIAS = "kavach";

    private CertificateService() {}

    public static Path ensureCertificate(Path dataDir) {
        Path keystorePath = dataDir.resolve(KEYSTORE_FILENAME);
        Path passwordPath = dataDir.resolve(PASSWORD_FILENAME);

        if (Files.exists(keystorePath) && Files.exists(passwordPath)) {
            return keystorePath;
        }

        log.info("Generating self-signed TLS certificate for localhost HTTPS...");
        try {
            String password = "kavach-tls-" + System.currentTimeMillis();
            generate(keystorePath, password);
            Files.writeString(passwordPath, password);
            log.info("TLS certificate created at {}", keystorePath);
            return keystorePath;
        } catch (Exception e) {
            log.warn("TLS certificate generation failed ({}). Starting on HTTP instead.", e.getMessage());
            return null;
        }
    }

    public static String readPassword(Path dataDir) throws IOException {
        return Files.readString(dataDir.resolve(PASSWORD_FILENAME)).strip();
    }

    private static void generate(Path keystorePath, String password)
            throws IOException, InterruptedException {
        String keytoolName = System.getProperty("os.name", "").toLowerCase().contains("win")
                ? "keytool.exe" : "keytool";
        String keytool = Path.of(System.getProperty("java.home"), "bin", keytoolName).toString();

        ProcessBuilder pb = new ProcessBuilder(
                keytool,
                "-genkeypair",
                "-alias",     KEY_ALIAS,
                "-keyalg",    "RSA",
                "-keysize",   "2048",
                "-validity",  "3650",
                "-dname",     "CN=localhost, O=Kavach",
                "-keystore",  keystorePath.toString(),
                "-storetype", "PKCS12",
                "-storepass", password,
                "-keypass",   password,
                "-noprompt"
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();
        int exit = process.waitFor();
        if (exit != 0) {
            String output = new String(process.getInputStream().readAllBytes()).strip();
            throw new IOException("keytool exited with code " + exit + ": " + output);
        }
    }
}
