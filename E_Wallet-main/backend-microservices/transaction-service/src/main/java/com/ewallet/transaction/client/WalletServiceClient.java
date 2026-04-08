package com.ewallet.transaction.client;

import com.ewallet.transaction.dto.AccountWalletOperationRequest;
import com.ewallet.transaction.dto.AmountOperationRequest;
import com.ewallet.transaction.dto.SelfTransferOperationRequest;
import com.ewallet.transaction.dto.WalletOperationResponse;
import com.ewallet.transaction.dto.WalletTransferOperationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "wallet-service")
public interface WalletServiceClient {

    @PostMapping("/internal/transactions/add-money")
    WalletOperationResponse addMoney(@RequestBody AmountOperationRequest request);

    @PostMapping("/internal/transactions/add-from-account")
    WalletOperationResponse addFromAccount(@RequestBody AccountWalletOperationRequest request);

    @PostMapping("/internal/transactions/withdraw")
    WalletOperationResponse withdraw(@RequestBody AccountWalletOperationRequest request);

    @PostMapping("/internal/transactions/self-transfer")
    WalletOperationResponse selfTransfer(@RequestBody SelfTransferOperationRequest request);

    @PostMapping("/internal/transactions/wallet-transfer")
    WalletOperationResponse walletTransfer(@RequestBody WalletTransferOperationRequest request);
}
