package com.ewallet.wallet.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletOperationEvent(
        String referenceId,
        Long senderId,
        Long receiverId,
        BigDecimal amount,
        String type,
        String status,
        LocalDateTime occurredAt
) {
}
