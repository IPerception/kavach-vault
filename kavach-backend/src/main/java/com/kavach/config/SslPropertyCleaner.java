package com.kavach.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
class SslPropertyCleaner {

    @EventListener(ApplicationReadyEvent.class)
    void clear() {
        System.clearProperty("server.ssl.key-store-password");
        System.clearProperty("server.ssl.key-store");
        System.clearProperty("server.ssl.key-store-type");
        System.clearProperty("server.ssl.key-alias");
        System.clearProperty("server.ssl.enabled");
    }
}
