package com.ewallet.transaction.dto;

public record InternalUserResponse(
        Long id,
        String name,
        String email,
        String phone,
        String username,
        String role,
        boolean blocked
) {
}
