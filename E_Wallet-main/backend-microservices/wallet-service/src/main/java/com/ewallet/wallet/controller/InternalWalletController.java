package com.ewallet.wallet.controller;

import com.ewallet.wallet.dto.AccountWalletOperationRequest;
import com.ewallet.wallet.dto.AmountOperationRequest;
import com.ewallet.wallet.dto.BankAccountResponse;
import com.ewallet.wallet.dto.SelfTransferOperationRequest;
import com.ewallet.wallet.dto.WalletOperationResponse;
import com.ewallet.wallet.dto.WalletSnapshotResponse;
import com.ewallet.wallet.dto.WalletTransferOperationRequest;
import com.ewallet.wallet.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/internal")
public class InternalWalletController {

    private final WalletService walletService;

    public InternalWalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/wallets/{userId}")
    public ResponseEntity<WalletSnapshotResponse> getWallet(@PathVariable Long userId) {
        return ResponseEntity.ok(walletService.getWalletSnapshot(userId));
    }

    @GetMapping("/accounts/user/{userId}")
    public ResponseEntity<List<BankAccountResponse>> getAccounts(@PathVariable Long userId) {
        return ResponseEntity.ok(walletService.getAccounts(userId));
    }

    @PostMapping("/transactions/add-money")
    public ResponseEntity<WalletOperationResponse> addMoney(@Valid @RequestBody AmountOperationRequest request) {
        return ResponseEntity.ok(walletService.addMoney(request));
    }

    @PostMapping("/transactions/add-from-account")
    public ResponseEntity<WalletOperationResponse> addFromAccount(@Valid @RequestBody AccountWalletOperationRequest request) {
        return ResponseEntity.ok(walletService.addFromAccount(request));
    }

    @PostMapping("/transactions/withdraw")
    public ResponseEntity<WalletOperationResponse> withdraw(@Valid @RequestBody AccountWalletOperationRequest request) {
        return ResponseEntity.ok(walletService.withdraw(request));
    }

    @PostMapping("/transactions/self-transfer")
    public ResponseEntity<WalletOperationResponse> selfTransfer(@Valid @RequestBody SelfTransferOperationRequest request) {
        return ResponseEntity.ok(walletService.selfTransfer(request));
    }

    @PostMapping("/transactions/wallet-transfer")
    public ResponseEntity<WalletOperationResponse> walletTransfer(@Valid @RequestBody WalletTransferOperationRequest request) {
        return ResponseEntity.ok(walletService.walletTransfer(request));
    }
}
