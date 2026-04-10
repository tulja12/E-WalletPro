package com.ewallet.auth.dto;

public record PasswordResetVerificationResponse(
        String message,
        String resetToken
) {
}
