package com.ewallet.wallet.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record UserTransferRequest(
        @NotBlank(message = "Receiver username is required")
        @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "Receiver username is invalid")
        String receiverUsername,
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount
) {
}
