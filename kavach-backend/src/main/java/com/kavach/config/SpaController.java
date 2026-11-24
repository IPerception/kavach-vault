package com.kavach.config;

import com.kavach.auth.SecurityHeadersFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/**
 * Serves index.html for all client-side routes so React Router can handle navigation.
 *
 * The page is returned directly (not forwarded to the static file) because the
 * __CSP_NONCE__ placeholder in its csp-nonce meta tag must be replaced with the
 * per-request nonce set by SecurityHeadersFilter. The response is no-store so a cached
 * copy never carries a stale nonce.
 *
 * Each mapping segment uses [^.]* which rejects any segment containing a dot, so
 * static assets like /assets/index-xxx.js fall through to Spring's resource handler
 * instead of being incorrectly served as HTML.
 *
 * Covers up to 3-level deep routes (/, /dashboard, /edit/42, /edit/42/detail).
 * The negative lookahead in the first segment excludes API and doc paths.
 * "/" and "/index.html" are mapped explicitly: "/" would otherwise go to Spring's
 * welcome-page handler and "/index.html" to the static resource handler, both of
 * which would serve the page with the placeholder unreplaced.
 */
@Controller
public class SpaController {

    static final String NONCE_PLACEHOLDER = "__CSP_NONCE__";

    private static final String FIRST = "/{path:^(?!api|swagger-ui|api-docs)[^.]*}";
    private static final String SEG1  = "/{sub1:[^.]*}";
    private static final String SEG2  = "/{sub2:[^.]*}";

    private static final Resource INDEX = new ClassPathResource("META-INF/resources/index.html");

    private volatile String indexTemplate;

    @GetMapping(value = {"/", "/index.html", FIRST, FIRST + SEG1, FIRST + SEG1 + SEG2})
    public ResponseEntity<String> index(HttpServletRequest request) {
        String template = template();
        if (template == null) {
            // Backend-only run without the frontend jar.
            return ResponseEntity.notFound().build();
        }
        String nonce = (String) request.getAttribute(SecurityHeadersFilter.NONCE_ATTRIBUTE);
        return ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noStore())
                .body(template.replace(NONCE_PLACEHOLDER, nonce == null ? "" : nonce));
    }

    private String template() {
        String cached = indexTemplate;
        if (cached == null && INDEX.exists()) {
            try (var in = INDEX.getInputStream()) {
                cached = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
            indexTemplate = cached;
        }
        return cached;
    }
}
