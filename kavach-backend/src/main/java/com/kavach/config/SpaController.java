package com.kavach.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves index.html for all client-side routes so React Router can handle navigation.
 *
 * Each mapping segment uses [^.]* which rejects any segment containing a dot, so
 * static assets like /assets/index-xxx.js fall through to Spring's resource handler
 * instead of being incorrectly served as HTML.
 *
 * Covers up to 3-level deep routes (/, /dashboard, /edit/42, /edit/42/detail).
 * The negative lookahead in the first segment excludes API and doc paths.
 */
@Controller
public class SpaController {

    private static final String FIRST = "/{path:^(?!api|swagger-ui|api-docs)[^.]*}";
    private static final String SEG1  = "/{sub1:[^.]*}";
    private static final String SEG2  = "/{sub2:[^.]*}";

    @GetMapping(value = {FIRST, FIRST + SEG1, FIRST + SEG1 + SEG2})
    public String forward() {
        return "forward:/index.html";
    }
}
