package com.ewallet.auth.dto;

public record AuthResponse(
        boolean mfaRequired,
        String token,
        String tempToken,
        Long userId,
        String role
) {
}
