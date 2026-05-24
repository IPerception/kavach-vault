package com.kavach.totp;

public interface TotpProvider {
    String generateSecret();
    String getQrCodeUri(String secret, String account, String issuer);
    boolean isValidCode(String secret, String code);
}
