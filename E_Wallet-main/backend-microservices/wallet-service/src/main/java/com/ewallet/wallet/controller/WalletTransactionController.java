package com.ewallet.wallet.controller;

import com.ewallet.wallet.dto.AccountAmountRequest;
import com.ewallet.wallet.dto.DirectAddMoneyRequest;
import com.ewallet.wallet.dto.SelfTransferRequest;
import com.ewallet.wallet.dto.UserTransferRequest;
import com.ewallet.wallet.service.WalletCommandService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class WalletTransactionController {

    private final WalletCommandService walletCommandService;

    public WalletTransactionController(WalletCommandService walletCommandService) {
        this.walletCommandService = walletCommandService;
    }

    @PostMapping("/wallet/add")
    public ResponseEntity<Map<String, Object>> addMoney(JwtAuthenticationToken authentication,
                                                        @Valid @RequestBody DirectAddMoneyRequest request) {
        return ResponseEntity.ok(walletCommandService.addMoney(userId(authentication), request));
    }

    @PostMapping("/wallet/add-from-account")
    public ResponseEntity<Map<String, Object>> addFromAccount(JwtAuthenticationToken authentication,
                                                              @Valid @RequestBody AccountAmountRequest request) {
        return ResponseEntity.ok(walletCommandService.addFromAccount(userId(authentication), request));
    }

    @PostMapping("/wallet/withdraw")
    public ResponseEntity<Map<String, Object>> withdraw(JwtAuthenticationToken authentication,
                                                        @Valid @RequestBody AccountAmountRequest request) {
        return ResponseEntity.ok(walletCommandService.withdraw(userId(authentication), request));
    }

    @PostMapping("/wallet/transfer/self")
    public ResponseEntity<Map<String, Object>> selfTransfer(JwtAuthenticationToken authentication,
                                                            @Valid @RequestBody SelfTransferRequest request) {
        return ResponseEntity.ok(walletCommandService.selfTransfer(userId(authentication), request));
    }

    @PostMapping("/wallet/transfer/user")
    public ResponseEntity<Map<String, Object>> walletTransfer(JwtAuthenticationToken authentication,
                                                              @Valid @RequestBody UserTransferRequest request) {
        return ResponseEntity.ok(walletCommandService.walletTransfer(userId(authentication), request));
    }

    private Long userId(JwtAuthenticationToken authentication) {
        Number userId = authentication.getToken().getClaim("userId");
        return userId.longValue();
    }
}
