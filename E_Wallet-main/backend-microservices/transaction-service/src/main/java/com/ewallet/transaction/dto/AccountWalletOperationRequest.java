package com.ewallet.transaction.dto;

import java.math.BigDecimal;

public record AccountWalletOperationRequest(
        Long userId,
        Long accountId,
        BigDecimal amount
) {
}
