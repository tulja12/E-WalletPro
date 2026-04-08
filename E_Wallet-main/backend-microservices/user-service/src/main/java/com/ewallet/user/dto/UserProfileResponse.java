package com.ewallet.user.dto;

public record UserProfileResponse(
        String username,
        String email,
        boolean mfaEnabled,
        boolean blocked,
        String role
) {
}
