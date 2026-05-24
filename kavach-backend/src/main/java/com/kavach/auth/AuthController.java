package com.kavach.auth;

import com.kavach.dto.TotpSetupResponse;
import com.kavach.dto.request.ChangePasswordRequest;
import com.kavach.dto.request.LoginRequest;
import com.kavach.dto.request.RegisterRequest;
import com.kavach.dto.request.TotpConfirmRequest;
import com.kavach.totp.TotpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final TotpService totpService;

    public AuthController(AuthService authService, JwtService jwtService, TotpService totpService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.totpService = totpService;
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@Valid @RequestBody LoginRequest request,
                                      HttpServletRequest servletRequest,
                                      HttpServletResponse response) {
        var user = authService.login(request, servletRequest.getRemoteAddr());
        String token = jwtService.generateToken(user.getUsername());
        response.addHeader(HttpHeaders.SET_COOKIE, jwtService.createJwtCookie(token).toString());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest servletRequest,
                                       HttpServletResponse response) {
        authService.logout(servletRequest.getRemoteAddr());
        response.addHeader(HttpHeaders.SET_COOKIE, jwtService.createClearCookie().toString());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> vaultStatus() {
        return ResponseEntity.ok(Map.of("initialized", authService.isVaultInitialized()));
    }

    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal String username,
            HttpServletResponse response) {
        authService.changePassword(request, username);
        response.addHeader(HttpHeaders.SET_COOKIE, jwtService.createClearCookie().toString());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/totp/setup")
    public ResponseEntity<TotpSetupResponse> totpSetup(
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(totpService.initiateSetup(username));
    }

    @PostMapping("/totp/confirm")
    public ResponseEntity<Void> totpConfirm(
            @Valid @RequestBody TotpConfirmRequest request,
            @AuthenticationPrincipal String username) {
        totpService.confirmSetup(request.getCode(), username);
        return ResponseEntity.ok().build();
    }
}
