package com.kavach;

import com.kavach.config.CertificateService;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
public class KavachApplication {

    public static void main(String[] args) throws Exception {
        String dataDir = System.getProperty("kavach.data.dir",
                Paths.get(System.getProperty("user.home"), ".kavach").toString());
        System.setProperty("kavach.data.dir", dataDir);
        Files.createDirectories(Path.of(dataDir));
        System.setProperty("spring.datasource.url", "jdbc:sqlite:" + dataDir + "/kavach.db");

        Path dataDirPath = Path.of(dataDir);
        Path keystorePath = CertificateService.ensureCertificate(dataDirPath);
        if (keystorePath != null) {
            String ksPassword = CertificateService.readPassword(dataDirPath);
            System.setProperty("server.ssl.enabled", "true");
            System.setProperty("server.ssl.key-store", "file:" + keystorePath);
            System.setProperty("server.ssl.key-store-password", ksPassword);
            System.setProperty("server.ssl.key-store-type", "PKCS12");
            System.setProperty("server.ssl.key-alias", CertificateService.KEY_ALIAS);
        }

        SpringApplication.run(KavachApplication.class, args);
    }
}
