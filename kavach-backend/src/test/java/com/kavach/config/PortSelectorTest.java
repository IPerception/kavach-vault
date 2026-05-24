package com.kavach.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.server.ConfigurableWebServerFactory;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class PortSelectorTest {

    private final PortSelector selector = new PortSelector();
    private final Path portFile = Path.of(PortSelector.PORT_FILE);

    @AfterEach
    void cleanup() throws IOException {
        Files.deleteIfExists(portFile);
    }

    @Test
    void picksFirstCandidateWhenFree() {
        ConfigurableWebServerFactory factory = mock(ConfigurableWebServerFactory.class);

        selector.customize(factory);

        verify(factory).setPort(8080);
        verify(factory).setAddress(InetAddress.getLoopbackAddress());
        assertThat(portFile).exists();
        assertThat(portFile).hasContent("8080");
    }

    @Test
    void skipsOccupiedPortAndPicksNext() throws IOException {
        try (ServerSocket blocker = new ServerSocket()) {
            blocker.setReuseAddress(false);
            blocker.bind(new InetSocketAddress(InetAddress.getLoopbackAddress(), 8080));

            ConfigurableWebServerFactory factory = mock(ConfigurableWebServerFactory.class);
            selector.customize(factory);

            verify(factory).setPort(8090);
            assertThat(portFile).hasContent("8090");
        }
    }

    @Test
    void fallsBackToOsPortWhenAllCandidatesTaken() throws IOException {
        try (ServerSocket b1 = occupyLoopback(8080);
             ServerSocket b2 = occupyLoopback(8090);
             ServerSocket b3 = occupyLoopback(8100)) {

            ConfigurableWebServerFactory factory = mock(ConfigurableWebServerFactory.class);
            selector.customize(factory);

            verify(factory).setPort(0);
        }
    }

    @Test
    void portFileContentIsPlainPortNumber() {
        ConfigurableWebServerFactory factory = mock(ConfigurableWebServerFactory.class);
        selector.customize(factory);

        assertThat(portFile).exists();
        assertThat(portFile).hasContent("8080");
    }

    private ServerSocket occupyLoopback(int port) throws IOException {
        ServerSocket s = new ServerSocket();
        s.setReuseAddress(false);
        s.bind(new InetSocketAddress(InetAddress.getLoopbackAddress(), port));
        return s;
    }
}
