package com.ewallet.auth.dto;

public record UserRegistrationResponse(
        Long id,
        String username,
        String role
) {
}
