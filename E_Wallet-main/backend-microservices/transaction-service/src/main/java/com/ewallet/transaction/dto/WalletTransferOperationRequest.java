package com.ewallet.transaction.dto;

import java.math.BigDecimal;

public record WalletTransferOperationRequest(
        Long senderUserId,
        Long receiverUserId,
        BigDecimal amount
) {
}
