package com.ewallet.auth.controller;

import com.ewallet.auth.dto.AuthResponse;
import com.ewallet.auth.dto.ForgotPasswordRequest;
import com.ewallet.auth.dto.LoginRequest;
import com.ewallet.auth.dto.MfaVerificationRequest;
import com.ewallet.auth.dto.PasswordResetChallengeResponse;
import com.ewallet.auth.dto.PasswordResetRequest;
import com.ewallet.auth.dto.PasswordResetVerificationResponse;
import com.ewallet.auth.dto.SignupRequest;
import com.ewallet.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request, null);
    }

    @PostMapping("/auth/login/user")
    public ResponseEntity<AuthResponse> userLogin(@Valid @RequestBody LoginRequest request) {
        return authService.login(request, "USER");
    }

    @PostMapping("/auth/login/admin")
    public ResponseEntity<AuthResponse> adminLogin(@Valid @RequestBody LoginRequest request) {
        return authService.login(request, "ADMIN");
    }

    @PostMapping("/auth/enable-mfa")
    public ResponseEntity<Map<String, String>> enableMfa(Authentication authentication) {
        return ResponseEntity.ok(authService.enableMfa(authentication.getName()));
    }

    @PostMapping("/auth/disable-mfa")
    public ResponseEntity<Map<String, String>> disableMfa(Authentication authentication) {
        return ResponseEntity.ok(authService.disableMfa(authentication.getName()));
    }

    @GetMapping("/auth/mfa-status")
    public ResponseEntity<Map<String, Boolean>> mfaStatus(Authentication authentication) {
        return ResponseEntity.ok(authService.mfaStatus(authentication.getName()));
    }

    @PostMapping("/auth/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                       @Valid @RequestBody MfaVerificationRequest request) {
        return authService.verifyOtp(authorizationHeader, request);
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<PasswordResetChallengeResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.startForgotPassword(request);
    }

    @PostMapping("/auth/forgot-password/verify-otp")
    public ResponseEntity<PasswordResetVerificationResponse> verifyForgotPasswordOtp(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody MfaVerificationRequest request) {
        return authService.verifyForgotPasswordOtp(authorizationHeader, request);
    }

    @PostMapping("/auth/forgot-password/reset")
    public ResponseEntity<Map<String, String>> resetForgotPassword(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody PasswordResetRequest request) {
        return authService.resetForgotPassword(authorizationHeader, request);
    }
}
