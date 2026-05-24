package com.kavach.notification;

public interface NotificationStrategy {
    void sendOtp(String recipient, String otpCode);
}
