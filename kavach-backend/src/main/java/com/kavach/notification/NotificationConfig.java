package com.kavach.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

@Configuration
public class NotificationConfig {

    @Bean
    @ConditionalOnProperty(name = "spring.mail.host")
    public NotificationStrategy emailNotificationStrategy(JavaMailSender mailSender) {
        return new EmailNotificationStrategy(mailSender);
    }

    // Fallback: active when spring.mail.host is not set.
    // @ConditionalOnMissingBean is reliable here because @Bean method evaluation
    // order within a @Configuration class is deterministic.
    @Bean
    @ConditionalOnMissingBean(NotificationStrategy.class)
    public NotificationStrategy loggingNotificationStrategy() {
        return new LoggingNotificationStrategy();
    }
}
