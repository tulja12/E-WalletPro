package com.ewallet.auth.dto;

public record PasswordResetChallengeResponse(
        String message,
        String tempToken
) {
}
