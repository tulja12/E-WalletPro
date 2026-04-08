package com.ewallet.transaction.service;

import com.ewallet.transaction.client.UserServiceClient;
import com.ewallet.transaction.client.WalletServiceClient;
import com.ewallet.transaction.dto.AccountAmountRequest;
import com.ewallet.transaction.dto.AccountWalletOperationRequest;
import com.ewallet.transaction.dto.DirectAddMoneyRequest;
import com.ewallet.transaction.dto.InternalUserResponse;
import com.ewallet.transaction.dto.SelfTransferOperationRequest;
import com.ewallet.transaction.dto.SelfTransferRequest;
import com.ewallet.transaction.dto.UserTransferRequest;
import com.ewallet.transaction.dto.WalletOperationResponse;
import com.ewallet.transaction.dto.WalletTransferOperationRequest;
import com.ewallet.transaction.exception.ApiException;
import feign.FeignException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class TransactionCommandService {

    private final WalletServiceClient walletServiceClient;
    private final UserServiceClient userServiceClient;
    private final ObjectMapper objectMapper;

    public TransactionCommandService(WalletServiceClient walletServiceClient,
                                     UserServiceClient userServiceClient,
                                     ObjectMapper objectMapper) {
        this.walletServiceClient = walletServiceClient;
        this.userServiceClient = userServiceClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> addMoney(Long userId, DirectAddMoneyRequest request) {
        WalletOperationResponse response = execute(() -> walletServiceClient.addMoney(
                new com.ewallet.transaction.dto.AmountOperationRequest(userId, request.amount())
        ));
        return Map.of(
                "message", "Money added",
                "balance", response.walletBalance()
        );
    }

    public Map<String, Object> addFromAccount(Long userId, AccountAmountRequest request) {
        WalletOperationResponse response = execute(() -> walletServiceClient.addFromAccount(
                new AccountWalletOperationRequest(userId, request.accountId(), request.amount())
        ));
        return Map.of(
                "message", "Wallet funded successfully",
                "walletBalance", response.walletBalance()
        );
    }

    public Map<String, Object> withdraw(Long userId, AccountAmountRequest request) {
        WalletOperationResponse response = execute(() -> walletServiceClient.withdraw(
                new AccountWalletOperationRequest(userId, request.accountId(), request.amount())
        ));
        return Map.of(
                "message", "Withdrawal successful",
                "walletBalance", response.walletBalance()
        );
    }

    public Map<String, Object> selfTransfer(Long userId, SelfTransferRequest request) {
        execute(() -> walletServiceClient.selfTransfer(
                new SelfTransferOperationRequest(userId, request.fromAccountId(), request.toAccountId(), request.amount())
        ));
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

        WalletOperationResponse response = execute(() -> walletServiceClient.walletTransfer(
                new WalletTransferOperationRequest(userId, receiver.id(), request.amount())
        ));

        return Map.of(
                "message", "Funds transferred successfully",
                "transactionId", response.referenceId(),
                "receiverId", receiver.id(),
                "receiverUsername", receiver.username(),
                "remainingWalletBalance", response.walletBalance()
        );
    }

    private WalletOperationResponse execute(WalletOperationCall call) {
        try {
            return call.invoke();
        } catch (FeignException ex) {
            throw translateFeignException(ex);
        }
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

    @FunctionalInterface
    private interface WalletOperationCall {
        WalletOperationResponse invoke();
    }
}
