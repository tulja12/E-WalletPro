package com.ewallet.transaction.dto;

import java.math.BigDecimal;

public record WalletOperationResponse(
        String referenceId,
        BigDecimal walletBalance
) {
}
