package com.kavach.credential;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class HibpServiceTest {

    @SuppressWarnings("unchecked")
    private HttpResponse<String> mockResponse(int status, String body) throws Exception {
        HttpResponse<String> resp = mock(HttpResponse.class);
        when(resp.statusCode()).thenReturn(status);
        when(resp.body()).thenReturn(body);
        return resp;
    }

    @Test
    void countBreaches_returnsZero_whenPasswordNotInList() throws Exception {
        // SHA-1 of "hunter2" = 0b213...
        byte[] pw = "hunter2".getBytes(StandardCharsets.UTF_8);

        HttpClient httpClient = mock(HttpClient.class);
        HttpResponse<String> resp = mockResponse(200, "AAAAA:3\r\nBBBBB:1\r\n");
        when(httpClient.send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any())).thenReturn(resp);

        HibpService service = new HibpService(httpClient);
        assertThat(service.countBreaches(pw)).isZero();
    }

    @Test
    void countBreaches_returnsCount_whenPasswordFoundInList() throws Exception {
        // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
        // prefix = 5BAA6, suffix = 1E4C9B93F3F0682250B6CF8331B7EE68FD8
        byte[] pw = "password".getBytes(StandardCharsets.UTF_8);
        String suffix = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";
        String body = "AAAAA:1\r\n" + suffix + ":3730471\r\nBBBBB:2\r\n";

        HttpClient httpClient = mock(HttpClient.class);
        HttpResponse<String> resp = mockResponse(200, body);
        when(httpClient.send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any())).thenReturn(resp);

        HibpService service = new HibpService(httpClient);
        assertThat(service.countBreaches(pw)).isEqualTo(3730471);
    }

    @Test
    void countBreaches_returnsZero_whenApiReturnsNonOk() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        HttpResponse<String> resp = mockResponse(429, "");
        when(httpClient.send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any())).thenReturn(resp);

        HibpService service = new HibpService(httpClient);
        assertThat(service.countBreaches("anypass".getBytes(StandardCharsets.UTF_8))).isZero();
    }

    @Test
    void countBreaches_returnsZero_onNetworkException() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        when(httpClient.send(any(HttpRequest.class), ArgumentMatchers.<HttpResponse.BodyHandler<String>>any())).thenThrow(new java.io.IOException("timeout"));

        HibpService service = new HibpService(httpClient);
        assertThat(service.countBreaches("anypass".getBytes(StandardCharsets.UTF_8))).isZero();
    }
}
