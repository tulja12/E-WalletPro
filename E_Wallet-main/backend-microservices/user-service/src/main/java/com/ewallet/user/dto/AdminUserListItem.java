package com.ewallet.user.dto;

import java.math.BigDecimal;

public record AdminUserListItem(
        Long id,
        String name,
        String username,
        String email,
        String phone,
        String role,
        boolean mfaEnabled,
        boolean blocked,
        BigDecimal walletBalance
) {
}
