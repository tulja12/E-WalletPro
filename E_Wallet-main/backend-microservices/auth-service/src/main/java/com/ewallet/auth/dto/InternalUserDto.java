package com.ewallet.auth.dto;

public record InternalUserDto(
        Long id,
        String name,
        String email,
        String phone,
        String username,
        String passkey,
        boolean mfaEnabled,
        String mfaSecret,
        boolean blocked,
        String role
) {
}
