package com.kavach.otp;

import java.time.Instant;

public final class OtpEntry {

    private final String code;
    private final Instant expiresAt;

    OtpEntry(String code, Instant expiresAt) {
        this.code = code;
        this.expiresAt = expiresAt;
    }

    public String getCode() { return code; }

    public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
}
