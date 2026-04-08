package com.ewallet.wallet.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record WalletTransferOperationRequest(
        @NotNull(message = "Sender user id is required")
        Long senderUserId,
        @NotNull(message = "Receiver user id is required")
        Long receiverUserId,
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount
) {
}
