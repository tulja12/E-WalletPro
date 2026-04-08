package com.ewallet.wallet.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record BankAccountRequest(
        @NotBlank(message = "Bank name is required")
        @Size(max = 80, message = "Bank name must be 80 characters or fewer")
        @Pattern(regexp = "^[A-Za-z ]+$", message = "Bank name can contain only letters and spaces")
        String bankName,
        @NotBlank(message = "Card number is required")
        @Pattern(regexp = "^[0-9 ]{12,19}$", message = "Card number must contain 12 to 19 digits")
        String cardNumber,
        @NotBlank(message = "Account holder is required")
        @Size(max = 100, message = "Account holder must be 100 characters or fewer")
        @Pattern(regexp = "^[A-Za-z ]+$", message = "Account holder can contain only letters and spaces")
        String accountHolder,
        @NotNull(message = "Initial balance is required")
        @DecimalMin(value = "0.00", message = "Initial balance cannot be negative")
        BigDecimal balance
) {
}
