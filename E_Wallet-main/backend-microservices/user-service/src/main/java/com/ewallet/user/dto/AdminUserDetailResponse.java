package com.ewallet.user.dto;

import java.math.BigDecimal;
import java.util.List;

public record AdminUserDetailResponse(
        Long id,
        String name,
        String username,
        String email,
        String phone,
        String role,
        boolean mfaEnabled,
        boolean blocked,
        BigDecimal walletBalance,
        List<BankAccountResponse> bankAccounts
) {
}
