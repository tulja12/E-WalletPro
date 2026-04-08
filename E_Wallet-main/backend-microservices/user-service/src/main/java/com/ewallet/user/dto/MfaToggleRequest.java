package com.ewallet.user.dto;

import jakarta.validation.constraints.NotNull;

public record MfaToggleRequest(
        @NotNull(message = "MFA enabled flag is required")
        Boolean enabled
) {
}
