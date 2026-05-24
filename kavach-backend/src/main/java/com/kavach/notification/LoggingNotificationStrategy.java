package com.kavach.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class LoggingNotificationStrategy implements NotificationStrategy {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationStrategy.class);

    @Override
    public void sendOtp(String recipient, String otpCode) {
        log.info("OTP for {}: {} (configure spring.mail.host to send via email)", recipient, otpCode);
    }
}
