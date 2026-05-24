package com.kavach.totp;

import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.springframework.stereotype.Component;

@Component
class SamstevensTotpProvider implements TotpProvider {

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeVerifier codeVerifier;

    SamstevensTotpProvider() {
        codeVerifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());
    }

    @Override
    public String generateSecret() {
        return secretGenerator.generate();
    }

    @Override
    public String getQrCodeUri(String secret, String account, String issuer) {
        return new QrData.Builder()
                .secret(secret)
                .label(account)
                .issuer(issuer)
                .build()
                .getUri();
    }

    @Override
    public boolean isValidCode(String secret, String code) {
        return codeVerifier.isValidCode(secret, code);
    }
}
