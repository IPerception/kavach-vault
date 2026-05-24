package com.kavach.otp;

import com.kavach.dto.RevealResponse;
import com.kavach.dto.request.RevealRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/credentials")
public class OtpController {

    private final OtpService otpService;

    public OtpController(OtpService otpService) {
        this.otpService = otpService;
    }

    @PostMapping("/{id}/reveal")
    public ResponseEntity<RevealResponse> reveal(
            @PathVariable Long id,
            @Valid @RequestBody RevealRequest request,
            @AuthenticationPrincipal String username) {
        String password = otpService.reveal(id, request.getOtp(), username);
        return ResponseEntity.ok(new RevealResponse(password));
    }
}
