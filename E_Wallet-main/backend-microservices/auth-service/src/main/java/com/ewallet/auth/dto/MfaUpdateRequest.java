package com.ewallet.auth.dto;

public record MfaUpdateRequest(
        boolean enabled,
        String secret
) {
}
