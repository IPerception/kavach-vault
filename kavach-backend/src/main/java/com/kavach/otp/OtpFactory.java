package com.kavach.otp;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

@Component
public class OtpFactory {

    static final Duration EXPIRY = Duration.ofMinutes(5);
    private final SecureRandom random = new SecureRandom();

    public OtpEntry create() {
        String code = String.format("%06d", random.nextInt(1_000_000));
        return new OtpEntry(code, Instant.now().plus(EXPIRY));
    }
}
