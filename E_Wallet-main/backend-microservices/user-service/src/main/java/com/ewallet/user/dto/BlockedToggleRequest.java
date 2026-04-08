package com.ewallet.user.dto;

import jakarta.validation.constraints.NotNull;

public record BlockedToggleRequest(
        @NotNull(message = "Blocked flag is required")
        Boolean blocked
) {
}
