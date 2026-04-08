package com.ewallet.user.dto;

public record MfaUpdateRequest(
        boolean enabled,
        String secret
) {
}
