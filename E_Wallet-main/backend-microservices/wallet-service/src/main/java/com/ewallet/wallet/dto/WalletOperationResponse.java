package com.ewallet.wallet.dto;

import java.math.BigDecimal;

public record WalletOperationResponse(
        String referenceId,
        BigDecimal walletBalance
) {
}
