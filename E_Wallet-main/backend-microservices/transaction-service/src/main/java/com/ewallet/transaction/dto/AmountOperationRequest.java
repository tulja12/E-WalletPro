package com.ewallet.transaction.dto;

import java.math.BigDecimal;

public record AmountOperationRequest(
        Long userId,
        BigDecimal amount
) {
}
