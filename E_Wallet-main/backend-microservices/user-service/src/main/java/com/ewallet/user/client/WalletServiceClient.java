package com.ewallet.user.client;

import com.ewallet.user.dto.BankAccountResponse;
import com.ewallet.user.dto.WalletSnapshotResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "wallet-service")
public interface WalletServiceClient {

    @GetMapping("/internal/wallets/{userId}")
    WalletSnapshotResponse getWalletByUserId(@PathVariable("userId") Long userId);

    @GetMapping("/internal/accounts/user/{userId}")
    List<BankAccountResponse> getAccountsByUserId(@PathVariable("userId") Long userId);
}
