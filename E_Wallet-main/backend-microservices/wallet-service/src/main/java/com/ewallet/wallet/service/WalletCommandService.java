package com.ewallet.wallet.service;

import com.ewallet.wallet.client.UserServiceClient;
import com.ewallet.wallet.dto.AccountAmountRequest;
import com.ewallet.wallet.dto.AccountWalletOperationRequest;
import com.ewallet.wallet.dto.AmountOperationRequest;
import com.ewallet.wallet.dto.DirectAddMoneyRequest;
import com.ewallet.wallet.dto.InternalUserResponse;
import com.ewallet.wallet.dto.SelfTransferOperationRequest;
import com.ewallet.wallet.dto.SelfTransferRequest;
import com.ewallet.wallet.dto.UserTransferRequest;
import com.ewallet.wallet.dto.WalletOperationResponse;
import com.ewallet.wallet.dto.WalletTransferOperationRequest;
import com.ewallet.wallet.exception.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class WalletCommandService {

    private final WalletService walletService;
    private final UserServiceClient userServiceClient;
    private final ObjectMapper objectMapper;

    public WalletCommandService(WalletService walletService,
                                UserServiceClient userServiceClient,
                                ObjectMapper objectMapper) {
        this.walletService = walletService;
        this.userServiceClient = userServiceClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> addMoney(Long userId, DirectAddMoneyRequest request) {
        WalletOperationResponse response = walletService.addMoney(new AmountOperationRequest(userId, request.amount()));
        return Map.of(
                "message", "Money added",
                "balance", response.walletBalance()
        );
    }

    public Map<String, Object> addFromAccount(Long userId, AccountAmountRequest request) {
        WalletOperationResponse response = walletService.addFromAccount(
                new AccountWalletOperationRequest(userId, request.accountId(), request.pin(), request.amount())
        );
        return Map.of(
                "message", "Wallet funded successfully",
                "walletBalance", response.walletBalance()
        );
    }

    public Map<String, Object> withdraw(Long userId, AccountAmountRequest request) {
        WalletOperationResponse response = walletService.withdraw(
                new AccountWalletOperationRequest(userId, request.accountId(), request.pin(), request.amount())
        );
        return Map.of(
                "message", "Withdrawal successful",
                "walletBalance", response.walletBalance()
        );
    }

    public Map<String, Object> selfTransfer(Long userId, SelfTransferRequest request) {
        walletService.selfTransfer(
                new SelfTransferOperationRequest(userId, request.fromAccountId(), request.toAccountId(), request.pin(), request.amount())
        );
        return Map.of("message", "Self-transfer successful");
    }

    public Map<String, Object> walletTransfer(Long userId, UserTransferRequest request) {
        String receiverUsername = request.receiverUsername() == null ? "" : request.receiverUsername().trim();
        if (receiverUsername.isBlank()) {
            throw ApiException.badRequest("Receiver username is required");
        }

        InternalUserResponse receiver;
        try {
            receiver = userServiceClient.getByUsername(receiverUsername);
        } catch (FeignException.NotFound ex) {
            throw ApiException.badRequest("Receiver username not found");
        } catch (FeignException ex) {
            throw translateFeignException(ex);
        }

        if (receiver.blocked()) {
            throw ApiException.badRequest("Receiver account is blocked");
        }

        if ("ADMIN".equalsIgnoreCase(receiver.role())) {
            throw ApiException.badRequest("Transfers to admin accounts are not allowed");
        }

        WalletOperationResponse response = walletService.walletTransfer(
                new WalletTransferOperationRequest(userId, receiver.id(), request.amount())
        );

        return Map.of(
                "message", "Funds transferred successfully",
                "transactionId", response.referenceId(),
                "receiverId", receiver.id(),
                "receiverUsername", receiver.username(),
                "remainingWalletBalance", response.walletBalance()
        );
    }

    private ApiException translateFeignException(FeignException ex) {
        HttpStatus status = HttpStatus.resolve(ex.status());
        String message = "Request failed";
        try {
            JsonNode node = objectMapper.readTree(ex.contentUTF8());
            if (node.hasNonNull("message")) {
                message = node.get("message").asText();
            } else if (node.hasNonNull("detail")) {
                message = node.get("detail").asText();
            }
        } catch (Exception ignored) {
            if (ex.getMessage() != null && !ex.getMessage().isBlank()) {
                message = ex.getMessage();
            }
        }
        return status == null ? ApiException.badGateway(message) : ApiException.withStatus(status, message);
    }
}
