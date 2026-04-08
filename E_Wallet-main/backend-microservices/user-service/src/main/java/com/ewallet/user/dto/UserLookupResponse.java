package com.ewallet.user.dto;

public record UserLookupResponse(
        Long id,
        String name,
        String username,
        String email,
        String role,
        boolean blocked
) {
}
