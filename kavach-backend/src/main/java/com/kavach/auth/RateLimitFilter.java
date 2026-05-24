package com.kavach.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimitFilter extends OncePerRequestFilter {

    private static final String LOGIN_PATH = "/api/auth/login";
    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final int maxAttempts;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public RateLimitFilter(ObjectMapper objectMapper, int maxAttempts) {
        this.objectMapper = objectMapper;
        this.maxAttempts = maxAttempts;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if ("POST".equalsIgnoreCase(request.getMethod()) &&
                LOGIN_PATH.equals(request.getRequestURI())) {
            Bucket bucket = buckets.computeIfAbsent(request.getRemoteAddr(), ip -> newBucket());
            if (!bucket.tryConsume(1)) {
                writeTooManyRequests(response);
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private Bucket newBucket() {
        // Refill all tokens at once after the window expires (hard lockout behaviour).
        Bandwidth limit = Bandwidth.classic(maxAttempts, Refill.intervally(maxAttempts, WINDOW));
        return Bucket.builder().addLimit(limit).build();
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many login attempts. Try again in 15 minutes.");
        problem.setTitle("Too Many Requests");
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }
}
