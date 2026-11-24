package com.kavach.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class SecurityHeadersFilter extends OncePerRequestFilter {

    /**
     * Everything same-origin, except that the frontend's update check
     * (useUpdateCheck.ts) may fetch the GitHub releases API. Without the connect-src
     * entry the update banner can never appear in the packaged app.
     */
    static final String CONTENT_SECURITY_POLICY =
            "default-src 'self'; connect-src 'self' https://api.github.com";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
        chain.doFilter(request, response);
    }
}
