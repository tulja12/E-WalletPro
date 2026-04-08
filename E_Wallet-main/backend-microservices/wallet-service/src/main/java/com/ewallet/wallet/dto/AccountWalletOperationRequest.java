package com.ewallet.wallet.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AccountWalletOperationRequest(
        @NotNull(message = "User id is required")
        Long userId,
        @NotNull(message = "Account id is required")
        Long accountId,
        @NotNull(message = "PIN is required")
        String pin,
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount
) {
}
