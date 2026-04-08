package com.ewallet.wallet.dto;

import java.math.BigDecimal;

public record WalletBalanceResponse(
        BigDecimal balance
) {
}
