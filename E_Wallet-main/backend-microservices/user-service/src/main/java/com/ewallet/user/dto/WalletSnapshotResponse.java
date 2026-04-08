package com.ewallet.user.dto;

import java.math.BigDecimal;

public record WalletSnapshotResponse(
        Long userId,
        BigDecimal balance
) {
}
