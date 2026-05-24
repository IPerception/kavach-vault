package com.kavach.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    /**
     * CORS (Cross-Origin Resource Sharing) lets the browser make API calls from a
     * different origin than the server. In development, the React app runs on Vite's
     * dev server (localhost:5173) while the API is on localhost:8080 — a different
     * port counts as a different origin. Without this configuration the browser
     * would block every API response with a CORS error.
     *
     * In production the React build is served by Spring Boot as static files on the
     * same origin (localhost:8080), so CORS headers are not needed — and the allowed
     * origins list intentionally contains only the dev server address.
     *
     * allowCredentials=true is required so the browser sends the httpOnly JWT cookie
     * with cross-origin requests during development.
     *
     * Spring Security automatically discovers the CorsConfigurationSource bean
     * when .cors(withDefaults()) is used in the filter chain.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
