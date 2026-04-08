package com.ewallet.user.dto;

public record UserRegistrationResponse(
        Long id,
        String username,
        String role
) {
}
