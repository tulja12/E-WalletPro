package com.ewallet.wallet.event;

public record UserRegisteredEvent(
        Long userId,
        String username,
        String email
) {
}
