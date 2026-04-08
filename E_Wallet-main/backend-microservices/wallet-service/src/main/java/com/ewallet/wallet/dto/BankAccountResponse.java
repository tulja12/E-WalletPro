package com.ewallet.wallet.dto;

import java.math.BigDecimal;

public record BankAccountResponse(
        Long id,
        String bankName,
        String cardNumber,
        String accountHolder,
        BigDecimal balance
) {
}
