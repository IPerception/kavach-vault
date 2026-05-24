package com.kavach.auth;

import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import javax.crypto.SecretKey;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        SecretKey testKey = Jwts.SIG.HS256.key().build();
        jwtService = new JwtService(testKey);
    }

    @Test
    void generateToken_containsSubjectUsername() {
        String token = jwtService.generateToken("alice");
        assertThat(jwtService.extractUsername(token)).isEqualTo("alice");
    }

    @Test
    void isTokenValid_withFreshToken_returnsTrue() {
        String token = jwtService.generateToken("alice");
        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    void isTokenValid_withTamperedSignature_returnsFalse() {
        String token = jwtService.generateToken("alice");
        String tampered = token.substring(0, token.length() - 4) + "XXXX";
        assertThat(jwtService.isTokenValid(tampered)).isFalse();
    }

    @Test
    void isTokenValid_withGarbage_returnsFalse() {
        assertThat(jwtService.isTokenValid("not.a.jwt")).isFalse();
    }

    @Test
    void createJwtCookie_isHttpOnly() {
        ResponseCookie cookie = jwtService.createJwtCookie(jwtService.generateToken("alice"));
        assertThat(cookie.isHttpOnly()).isTrue();
    }

    @Test
    void createJwtCookie_hasSameSiteStrict() {
        ResponseCookie cookie = jwtService.createJwtCookie(jwtService.generateToken("alice"));
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
    }

    @Test
    void createJwtCookie_hasCorrectName() {
        ResponseCookie cookie = jwtService.createJwtCookie(jwtService.generateToken("alice"));
        assertThat(cookie.getName()).isEqualTo(JwtService.COOKIE_NAME);
    }

    @Test
    void createClearCookie_hasMaxAgeZeroAndEmptyValue() {
        ResponseCookie cookie = jwtService.createClearCookie();
        assertThat(cookie.getMaxAge().isZero()).isTrue();
        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getName()).isEqualTo(JwtService.COOKIE_NAME);
    }
}
