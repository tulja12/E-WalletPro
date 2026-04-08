package com.ewallet.user.event;

public record UserRegisteredEvent(
        Long userId,
        String username,
        String email
) {
}
