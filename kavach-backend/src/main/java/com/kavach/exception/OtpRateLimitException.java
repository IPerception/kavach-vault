package com.kavach.exception;

public class OtpRateLimitException extends RuntimeException {
    public OtpRateLimitException() {
        super("Too many OTP requests. Try again in 15 minutes.");
    }
}
