package com.kavach.config;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.X509v3CertificateBuilder;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.OutputStream;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Date;

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

    public static String readPassword(Path dataDir) throws Exception {
        return Files.readString(dataDir.resolve(PASSWORD_FILENAME)).strip();
    }

    private static void generate(Path keystorePath, String password) throws Exception {
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
        keyGen.initialize(2048, new SecureRandom());
        KeyPair keyPair = keyGen.generateKeyPair();

        X500Name subject = new X500Name("CN=localhost,O=Kavach");
        BigInteger serial = new BigInteger(64, new SecureRandom());
        Date notBefore = new Date();
        Date notAfter = new Date(notBefore.getTime() + 3650L * 24 * 60 * 60 * 1000);

        X509v3CertificateBuilder certBuilder = new JcaX509v3CertificateBuilder(
                subject, serial, notBefore, notAfter, subject, keyPair.getPublic());

        ContentSigner signer = new JcaContentSignerBuilder("SHA256withRSA")
                .build(keyPair.getPrivate());

        X509Certificate cert = new JcaX509CertificateConverter()
                .getCertificate(certBuilder.build(signer));

        KeyStore ks = KeyStore.getInstance("PKCS12");
        ks.load(null, null);
        ks.setKeyEntry(KEY_ALIAS, keyPair.getPrivate(), password.toCharArray(),
                new Certificate[]{cert});
        try (OutputStream out = Files.newOutputStream(keystorePath)) {
            ks.store(out, password.toCharArray());
        }
    }
}
