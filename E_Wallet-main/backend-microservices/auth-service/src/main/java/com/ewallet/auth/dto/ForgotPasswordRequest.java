package com.ewallet.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
        @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "Username can contain only letters, numbers, dot, underscore, and hyphen")
        String username,
        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        String email
) {
}
