package com.ewallet.auth.service;

import com.ewallet.auth.client.UserServiceClient;
import com.ewallet.auth.dto.AuthResponse;
import com.ewallet.auth.dto.ForgotPasswordRequest;
import com.ewallet.auth.dto.InternalUserDto;
import com.ewallet.auth.dto.LoginRequest;
import com.ewallet.auth.dto.MfaUpdateRequest;
import com.ewallet.auth.dto.MfaVerificationRequest;
import com.ewallet.auth.dto.PasswordResetChallengeResponse;
import com.ewallet.auth.dto.PasswordResetRequest;
import com.ewallet.auth.dto.PasswordResetVerificationResponse;
import com.ewallet.auth.dto.SignupRequest;
import com.ewallet.auth.exception.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import io.jsonwebtoken.Claims;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Map;

@Service
public class AuthService {

    private final UserServiceClient userServiceClient;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final ObjectMapper objectMapper;

    public AuthService(UserServiceClient userServiceClient,
                       PasswordEncoder passwordEncoder,
                       TokenService tokenService,
                       ObjectMapper objectMapper) {
        this.userServiceClient = userServiceClient;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.objectMapper = objectMapper;
    }

    public ResponseEntity<?> signup(SignupRequest request) {
        try {
            userServiceClient.register(request);
            return ResponseEntity.ok("User Registered");
        } catch (FeignException ex) {
            throw translateFeignException(ex, "Signup is unavailable right now.");
        }
    }

    public ResponseEntity<AuthResponse> login(LoginRequest request, String expectedRole) {
        InternalUserDto user;
        try {
            user = userServiceClient.getByUsername(normalizeUsername(request.username()));
        } catch (FeignException.NotFound ex) {
            throw ApiException.unauthorized("Invalid username or password");
        } catch (FeignException ex) {
            throw translateFeignException(ex, "Login is unavailable right now.");
        }

        if (user.blocked()) {
            throw ApiException.forbidden("Your account has been blocked by admin");
        }

        if (!passwordEncoder.matches(safe(request.passkey()), user.passkey())) {
            throw ApiException.unauthorized("Invalid username or password");
        }

        validateLoginScope(user.role(), expectedRole);

        TokenService.InternalUserPrincipal principal = new TokenService.InternalUserPrincipal(user.id(), user.username(), user.role());
        if (user.mfaEnabled()) {
            return ResponseEntity.ok(new AuthResponse(
                    true,
                    null,
                    tokenService.generateMfaToken(principal),
                    user.id(),
                    user.role()
            ));
        }

        return ResponseEntity.ok(new AuthResponse(
                false,
                tokenService.generateAccessToken(principal),
                null,
                user.id(),
                user.role()
        ));
    }

    public Map<String, String> enableMfa(String username) {
        InternalUserDto user = getUserByUsername(username, "MFA setup is unavailable right now.");
        String secret = new DefaultSecretGenerator().generate();
        updateMfa(user.id(), new MfaUpdateRequest(true, secret), "MFA setup is unavailable right now.");

        try {
            QrData qrData = new QrData.Builder()
                    .label(username)
                    .secret(secret)
                    .issuer("EWallet")
                    .algorithm(HashingAlgorithm.SHA1)
                    .digits(6)
                    .period(30)
                    .build();
            byte[] imageData = new ZxingPngQrGenerator().generate(qrData);
            return Map.of(
                    "secret", secret,
                    "qrImage", Base64.getEncoder().encodeToString(imageData)
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to generate MFA QR code", ex);
        }
    }

    public Map<String, String> disableMfa(String username) {
        InternalUserDto user = getUserByUsername(username, "MFA update is unavailable right now.");
        updateMfa(user.id(), new MfaUpdateRequest(false, null), "MFA update is unavailable right now.");
        return Map.of("message", "MFA Disabled");
    }

    public Map<String, Boolean> mfaStatus(String username) {
        InternalUserDto user = getUserByUsername(username, "MFA status is unavailable right now.");
        return Map.of("enabled", user.mfaEnabled());
    }

    public ResponseEntity<PasswordResetChallengeResponse> startForgotPassword(ForgotPasswordRequest request) {
        String username = normalizeUsername(request.username());
        String email = normalizeContactEmail(request.email());

        InternalUserDto user = getUserByUsernameForPasswordReset(username, "Password reset is unavailable right now.");
        if (!email.equalsIgnoreCase(safe(user.email()).trim())) {
            throw ApiException.withStatus(HttpStatus.NOT_FOUND, "Username and email do not match");
        }
        ensureUserCanResetPassword(user);

        return ResponseEntity.ok(new PasswordResetChallengeResponse(
                "Enter the code from your authenticator app to continue.",
                tokenService.generatePasswordResetChallengeToken(toPrincipal(user))
        ));
    }

    public ResponseEntity<?> verifyOtp(String authorizationHeader, MfaVerificationRequest request) {
        Claims claims = parseBearerClaims(authorizationHeader);
        validateTokenType(claims, TokenService.MFA_TEMP_TOKEN_TYPE);
        String username = claims.getSubject();
        InternalUserDto user = getUserByUsername(username, "MFA verification is unavailable right now.");
        ensureUserNotBlocked(user);
        validateOtp(user, request.otp());

        String token = tokenService.generateAccessToken(toPrincipal(user));
        return ResponseEntity.ok(Map.of(
                "token", token,
                "userId", user.id(),
                "role", user.role()
        ));
    }

    public ResponseEntity<PasswordResetVerificationResponse> verifyForgotPasswordOtp(
            String authorizationHeader,
            MfaVerificationRequest request) {
        Claims claims = parseBearerClaims(authorizationHeader);
        validateTokenType(claims, TokenService.PASSWORD_RESET_MFA_TOKEN_TYPE);

        InternalUserDto user = getUserByUsername(claims.getSubject(), "Password reset verification is unavailable right now.");
        ensureUserCanResetPassword(user);
        validateOtp(user, request.otp());

        return ResponseEntity.ok(new PasswordResetVerificationResponse(
                "OTP verified. Set your new password.",
                tokenService.generatePasswordResetToken(toPrincipal(user))
        ));
    }

    public ResponseEntity<Map<String, String>> resetForgotPassword(String authorizationHeader, PasswordResetRequest request) {
        Claims claims = parseBearerClaims(authorizationHeader);
        validateTokenType(claims, TokenService.PASSWORD_RESET_TOKEN_TYPE);

        InternalUserDto user = getUserByUsername(claims.getSubject(), "Password reset is unavailable right now.");
        ensureUserCanResetPassword(user);

        try {
            userServiceClient.resetPassword(user.id(), request);
        } catch (FeignException ex) {
            throw translateFeignException(ex, "Password reset is unavailable right now.");
        }

        return ResponseEntity.ok(Map.of("message", "Password updated successfully. You can sign in now."));
    }

    private String normalizeUsername(String username) {
        return safe(username).trim();
    }

    private String normalizeContactEmail(String email) {
        return safe(email).trim();
    }

    private void validateLoginScope(String actualRole, String expectedRole) {
        if (expectedRole == null || expectedRole.isBlank()) {
            return;
        }
        if (!expectedRole.equalsIgnoreCase(actualRole)) {
            if ("ADMIN".equalsIgnoreCase(actualRole)) {
                throw ApiException.forbidden("Admin users must use the admin login page");
            }
            throw ApiException.forbidden("Standard users must use the user login page");
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private Claims parseBearerClaims(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw ApiException.unauthorized("Missing token");
        }

        try {
            return tokenService.parseClaims(authorizationHeader.substring(7));
        } catch (Exception ex) {
            throw ApiException.unauthorized("Invalid token");
        }
    }

    private void validateTokenType(Claims claims, String expectedTokenType) {
        if (!expectedTokenType.equals(claims.get("tokenType", String.class))) {
            throw ApiException.unauthorized("Invalid token type");
        }
    }

    private void ensureUserNotBlocked(InternalUserDto user) {
        if (user.blocked()) {
            throw ApiException.forbidden("Your account has been blocked by admin");
        }
    }

    private void ensureUserCanResetPassword(InternalUserDto user) {
        ensureUserNotBlocked(user);
        if (!user.mfaEnabled() || safe(user.mfaSecret()).isBlank()) {
            throw ApiException.badRequest("MFA is not enabled for this account");
        }
    }

    private void validateOtp(InternalUserDto user, String otp) {
        DefaultCodeVerifier verifier = new DefaultCodeVerifier(
                new DefaultCodeGenerator(HashingAlgorithm.SHA1),
                new SystemTimeProvider()
        );
        verifier.setAllowedTimePeriodDiscrepancy(1);

        if (!verifier.isValidCode(safe(user.mfaSecret()), safe(otp))) {
            throw ApiException.badRequest("Invalid OTP");
        }
    }

    private TokenService.InternalUserPrincipal toPrincipal(InternalUserDto user) {
        return new TokenService.InternalUserPrincipal(user.id(), user.username(), user.role());
    }

    private InternalUserDto getUserByUsername(String username, String fallbackMessage) {
        try {
            return userServiceClient.getByUsername(username);
        } catch (FeignException.NotFound ex) {
            throw ApiException.unauthorized("Invalid username or password");
        } catch (FeignException ex) {
            throw translateFeignException(ex, fallbackMessage);
        }
    }

    private InternalUserDto getUserByUsernameForPasswordReset(String username, String fallbackMessage) {
        try {
            return userServiceClient.getByUsername(username);
        } catch (FeignException.NotFound ex) {
            throw ApiException.withStatus(HttpStatus.NOT_FOUND, "Username and email do not match");
        } catch (FeignException ex) {
            throw translateFeignException(ex, fallbackMessage);
        }
    }

    private void updateMfa(Long userId, MfaUpdateRequest request, String fallbackMessage) {
        try {
            userServiceClient.updateMfa(userId, request);
        } catch (FeignException ex) {
            throw translateFeignException(ex, fallbackMessage);
        }
    }

    private ApiException translateFeignException(FeignException ex, String fallbackMessage) {
        HttpStatus status = HttpStatus.resolve(ex.status());
        String message = fallbackMessage;

        try {
            if (ex.contentUTF8() != null && !ex.contentUTF8().isBlank()) {
                JsonNode node = objectMapper.readTree(ex.contentUTF8());
                if (node.hasNonNull("message")) {
                    message = node.get("message").asText();
                } else if (node.hasNonNull("detail")) {
                    message = node.get("detail").asText();
                }
            }
        } catch (Exception ignored) {
            if (ex.getMessage() != null && !ex.getMessage().isBlank()) {
                message = ex.getMessage();
            }
        }

        if (status == null || status.is5xxServerError()) {
            return ApiException.serviceUnavailable(message);
        }
        return ApiException.withStatus(status, message);
    }
}
