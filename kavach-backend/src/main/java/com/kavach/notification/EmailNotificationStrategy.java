package com.kavach.notification;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

public class EmailNotificationStrategy implements NotificationStrategy {

    private final JavaMailSender mailSender;

    public EmailNotificationStrategy(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendOtp(String recipient, String otpCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(recipient);
        message.setSubject("Kavach - Your One-Time Password");
        message.setText("Your OTP is: " + otpCode + "\nThis code expires in 5 minutes.");
        mailSender.send(message);
    }
}
