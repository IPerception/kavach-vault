package com.kavach.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;

public class SecurityHeadersFilter extends OncePerRequestFilter {

    /** Request attribute holding this request's CSP style nonce (read by SpaController). */
    public static final String NONCE_ATTRIBUTE = SecurityHeadersFilter.class.getName() + ".NONCE";

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Everything same-origin, except that the frontend's update check
     * (useUpdateCheck.ts) may fetch the GitHub releases API. Without the connect-src
     * entry the update banner can never appear in the packaged app.
     *
     * style-src carries a per-request nonce because Radix dialogs lock scrolling through
     * react-remove-scroll-bar, which injects a <style> element at runtime; without the
     * nonce the browser blocks it and logs a violation. SpaController writes the nonce
     * into index.html, and the frontend hands it to that library (cspNonce.ts). Only
     * <style> elements may use it: script-src is not set, so scripts stay 'self' only
     * via default-src. Never add 'unsafe-inline' or 'unsafe-eval'.
     */
    static String contentSecurityPolicy(String nonce) {
        return "default-src 'self'; style-src 'self' 'nonce-" + nonce + "'; "
                + "connect-src 'self' https://api.github.com";
    }

    private static String newNonce() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-Content-Type-Options", "nosniff");
        String nonce = newNonce();
        request.setAttribute(NONCE_ATTRIBUTE, nonce);
        response.setHeader("Content-Security-Policy", contentSecurityPolicy(nonce));
        chain.doFilter(request, response);
    }
}
