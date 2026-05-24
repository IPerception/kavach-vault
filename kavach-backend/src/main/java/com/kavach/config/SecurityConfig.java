package com.kavach.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kavach.auth.JwtAuthFilter;
import com.kavach.auth.JwtService;
import com.kavach.auth.RateLimitFilter;
import com.kavach.auth.SecurityHeadersFilter;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import javax.crypto.SecretKey;
import java.security.SecureRandom;
import java.util.Base64;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper;

    public SecurityConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    // Produces the signing key injected into JwtService.
    // If kavach.jwt.secret is not set, a random key is generated on every startup,
    // which invalidates all existing sessions -- desirable for a local password manager.
    @Bean
    public SecretKey jwtSigningKey(@Value("${kavach.jwt.secret:}") String configuredSecret) {
        if (configuredSecret.isBlank()) {
            byte[] keyBytes = new byte[32];
            new SecureRandom().nextBytes(keyBytes);
            return Keys.hmacShaKeyFor(keyBytes);
        }
        return Keys.hmacShaKeyFor(Base64.getDecoder().decode(configuredSecret));
    }

    @Bean
    public JwtAuthFilter jwtAuthFilter(JwtService jwtService) {
        return new JwtAuthFilter(jwtService);
    }

    @Bean
    public RateLimitFilter rateLimitFilter(
            @Value("${kavach.ratelimit.login.capacity:5}") int loginCapacity) {
        return new RateLimitFilter(objectMapper, loginCapacity);
    }

    @Bean
    public SecurityHeadersFilter securityHeadersFilter() {
        return new SecurityHeadersFilter();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JwtAuthFilter jwtAuthFilter,
                                           RateLimitFilter rateLimitFilter,
                                           SecurityHeadersFilter securityHeadersFilter) throws Exception {
        return http
                // CSRF: disabled -- SameSite=Strict on the JWT cookie prevents cross-site
                //   requests from ever carrying the cookie, making CSRF tokens redundant.
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                // Disable Spring Security's default header management so SecurityHeadersFilter
                // is the single owner of X-Frame-Options, X-Content-Type-Options, and CSP.
                // Having both set the same headers would produce duplicate header values.
                .headers(headers -> headers.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Only these specific auth endpoints are public.
                        // /api/auth/change-password intentionally falls through to /api/** (requires auth).
                        .requestMatchers("/api/auth/login", "/api/auth/register",
                                "/api/auth/logout", "/api/auth/status").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(kavachAuthenticationEntryPoint())
                )
                // CORS: picks up CorsConfigurationSource bean from CorsConfig (allows localhost:5173
                //   with allowCredentials=true so the browser sends the JWT cookie cross-origin).
                .cors(withDefaults())
                // Custom filter chain: SecurityHeadersFilter -> RateLimitFilter -> JwtAuthFilter
                .addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, SecurityHeadersFilter.class)
                .addFilterAfter(jwtAuthFilter, RateLimitFilter.class)
                .build();
    }

    @Bean
    public AuthenticationEntryPoint kavachAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                    HttpStatus.UNAUTHORIZED, "Authentication is required to access this resource");
            problem.setTitle("Unauthorized");
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(), problem);
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            throw new UsernameNotFoundException("Use JWT authentication");
        };
    }
}
