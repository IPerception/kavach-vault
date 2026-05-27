package com.kavach.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.server.ConfigurableWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

/**
 * Probes candidate ports at startup and picks the first available one.
 * Writes the chosen port to kavach.port so the system tray and launcher
 * scripts can open the browser to the correct URL without hardcoding 8080.
 * The file is deleted automatically when the JVM exits, acting as a
 * presence signal: file exists = app is running on that port.
 */
@Component
public class PortSelector implements WebServerFactoryCustomizer<ConfigurableWebServerFactory> {

    private static final Logger log = LoggerFactory.getLogger(PortSelector.class);
    private static final int[] CANDIDATES = {8080, 8090, 8100};
    static final String PORT_FILE = "kavach.port";

    @Override
    public void customize(ConfigurableWebServerFactory factory) {
        for (int port : CANDIDATES) {
            if (isAvailable(port)) {
                factory.setPort(port);
                factory.setAddress(InetAddress.getLoopbackAddress());
                writePortFile(port);
                log.info("Kavach bound to 127.0.0.1:{}", port);
                return;
            }
            log.warn("Port {} is already in use, trying next candidate", port);
        }
        // All candidates taken -- let the OS pick a free ephemeral port.
        factory.setPort(0);
        factory.setAddress(InetAddress.getLoopbackAddress());
        log.warn("All candidate ports taken; falling back to OS-assigned port");
    }

    private boolean isAvailable(int port) {
        try (ServerSocket socket = new ServerSocket()) {
            socket.setReuseAddress(false);
            socket.bind(new InetSocketAddress(InetAddress.getLoopbackAddress(), port));
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private void writePortFile(int port) {
        try {
            String scheme = "true".equals(System.getProperty("server.ssl.enabled")) ? "https" : "http";
            String url = scheme + "://127.0.0.1:" + port;
            Path portFile = Path.of(PORT_FILE);
            Files.writeString(portFile, url,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            portFile.toFile().deleteOnExit();
            log.info("Kavach URL: {}", url);
        } catch (IOException e) {
            log.warn("Could not write {}: {}", PORT_FILE, e.getMessage());
        }
    }
}
