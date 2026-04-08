package com.ewallet.wallet.controller;

import com.ewallet.wallet.dto.WalletBalanceResponse;
import com.ewallet.wallet.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/wallet/balance")
    public ResponseEntity<WalletBalanceResponse> getBalance(JwtAuthenticationToken authentication) {
        Long userId = userId(authentication);
        return ResponseEntity.ok(new WalletBalanceResponse(walletService.getWalletSnapshot(userId).balance()));
    }

    private Long userId(JwtAuthenticationToken authentication) {
        Number userId = authentication.getToken().getClaim("userId");
        return userId.longValue();
    }
}
