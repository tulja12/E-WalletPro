package com.ewallet.transaction.controller;

import com.ewallet.transaction.dto.AccountAmountRequest;
import com.ewallet.transaction.dto.DirectAddMoneyRequest;
import com.ewallet.transaction.dto.SelfTransferRequest;
import com.ewallet.transaction.dto.TransactionHistoryItemDto;
import com.ewallet.transaction.dto.UserTransferRequest;
import com.ewallet.transaction.service.TransactionCommandService;
import com.ewallet.transaction.service.TransactionHistoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class TransactionController {

    private final TransactionCommandService transactionCommandService;
    private final TransactionHistoryService transactionHistoryService;

    public TransactionController(TransactionCommandService transactionCommandService,
                                 TransactionHistoryService transactionHistoryService) {
        this.transactionCommandService = transactionCommandService;
        this.transactionHistoryService = transactionHistoryService;
    }

    @PostMapping("/wallet/add")
    public ResponseEntity<Map<String, Object>> addMoney(JwtAuthenticationToken authentication,
                                                        @Valid @RequestBody DirectAddMoneyRequest request) {
        return ResponseEntity.ok(transactionCommandService.addMoney(userId(authentication), request));
    }

    @PostMapping("/wallet/add-from-account")
    public ResponseEntity<Map<String, Object>> addFromAccount(JwtAuthenticationToken authentication,
                                                              @Valid @RequestBody AccountAmountRequest request) {
        return ResponseEntity.ok(transactionCommandService.addFromAccount(userId(authentication), request));
    }

    @PostMapping("/wallet/withdraw")
    public ResponseEntity<Map<String, Object>> withdraw(JwtAuthenticationToken authentication,
                                                        @Valid @RequestBody AccountAmountRequest request) {
        return ResponseEntity.ok(transactionCommandService.withdraw(userId(authentication), request));
    }

    @PostMapping("/wallet/transfer/self")
    public ResponseEntity<Map<String, Object>> selfTransfer(JwtAuthenticationToken authentication,
                                                            @Valid @RequestBody SelfTransferRequest request) {
        return ResponseEntity.ok(transactionCommandService.selfTransfer(userId(authentication), request));
    }

    @PostMapping("/wallet/transfer/user")
    public ResponseEntity<Map<String, Object>> walletTransfer(JwtAuthenticationToken authentication,
                                                              @Valid @RequestBody UserTransferRequest request) {
        return ResponseEntity.ok(transactionCommandService.walletTransfer(userId(authentication), request));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionHistoryItemDto>> getTransactions(JwtAuthenticationToken authentication) {
        return ResponseEntity.ok(transactionHistoryService.getHistoryForUser(userId(authentication)));
    }

    private Long userId(JwtAuthenticationToken authentication) {
        Number userId = authentication.getToken().getClaim("userId");
        return userId.longValue();
    }
}
