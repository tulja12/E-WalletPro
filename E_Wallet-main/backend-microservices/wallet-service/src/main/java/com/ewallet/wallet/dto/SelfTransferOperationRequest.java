package com.ewallet.wallet.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SelfTransferOperationRequest(
        @NotNull(message = "User id is required")
        Long userId,
        @NotNull(message = "Source account is required")
        Long fromAccountId,
        @NotNull(message = "Destination account is required")
        Long toAccountId,
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount
) {
}
