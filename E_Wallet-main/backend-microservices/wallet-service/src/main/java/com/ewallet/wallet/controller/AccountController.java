package com.ewallet.wallet.controller;

import com.ewallet.wallet.dto.BankAccountRequest;
import com.ewallet.wallet.dto.BankAccountResponse;
import com.ewallet.wallet.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AccountController {

    private final WalletService walletService;

    public AccountController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<BankAccountResponse>> getAccounts(JwtAuthenticationToken authentication) {
        Long userId = userId(authentication);
        return ResponseEntity.ok(walletService.getAccounts(userId));
    }

    @PostMapping("/accounts")
    public ResponseEntity<BankAccountResponse> addAccount(JwtAuthenticationToken authentication,
                                                          @Valid @RequestBody BankAccountRequest request) {
        Long userId = userId(authentication);
        return ResponseEntity.ok(walletService.addAccount(userId, request));
    }

    @PutMapping("/accounts/{accountId}")
    public ResponseEntity<BankAccountResponse> updateAccount(JwtAuthenticationToken authentication,
                                                             @PathVariable Long accountId,
                                                             @Valid @RequestBody BankAccountRequest request) {
        Long userId = userId(authentication);
        return ResponseEntity.ok(walletService.updateAccount(userId, accountId, request));
    }

    @DeleteMapping("/accounts/{accountId}")
    public ResponseEntity<Void> deleteAccount(JwtAuthenticationToken authentication, @PathVariable Long accountId) {
        Long userId = userId(authentication);
        walletService.deleteAccount(userId, accountId);
        return ResponseEntity.noContent().build();
    }

    private Long userId(JwtAuthenticationToken authentication) {
        Number userId = authentication.getToken().getClaim("userId");
        return userId.longValue();
    }
}
