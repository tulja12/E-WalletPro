package com.ewallet.wallet.dto;

import java.math.BigDecimal;

public record WalletSnapshotResponse(
        Long userId,
        BigDecimal balance
) {
}
