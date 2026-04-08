package com.ewallet.transaction.dto;

import java.math.BigDecimal;

public record SelfTransferOperationRequest(
        Long userId,
        Long fromAccountId,
        Long toAccountId,
        BigDecimal amount
) {
}
