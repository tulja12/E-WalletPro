package com.ewallet.transaction.service;

import com.ewallet.transaction.client.UserServiceClient;
import com.ewallet.transaction.dto.TransactionHistoryItemDto;
import com.ewallet.transaction.dto.UserLookupResponse;
import com.ewallet.transaction.entity.TransactionRecord;
import com.ewallet.transaction.event.WalletOperationEvent;
import com.ewallet.transaction.repository.TransactionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TransactionHistoryService {

    private final TransactionRepository transactionRepository;
    private final UserServiceClient userServiceClient;
    private final ObjectMapper objectMapper;

    public TransactionHistoryService(TransactionRepository transactionRepository,
                                     UserServiceClient userServiceClient,
                                     ObjectMapper objectMapper) {
        this.transactionRepository = transactionRepository;
        this.userServiceClient = userServiceClient;
        this.objectMapper = objectMapper;
    }

    @JmsListener(destination = com.ewallet.transaction.config.MessagingConfig.WALLET_OPERATION_QUEUE)
    public void persistWalletOperation(String payload) {
        WalletOperationEvent event = deserialize(payload);
        if (transactionRepository.existsByReferenceId(event.referenceId())) {
            return;
        }

        TransactionRecord record = new TransactionRecord();
        record.setReferenceId(event.referenceId());
        record.setSenderId(event.senderId());
        record.setReceiverId(event.receiverId());
        record.setAmount(event.amount());
        record.setType(event.type());
        record.setStatus(event.status());
        record.setOccurredAt(event.occurredAt());
        transactionRepository.save(record);
    }

    public List<TransactionHistoryItemDto> getHistoryForUser(Long userId) {
        List<TransactionRecord> records = transactionRepository.findBySenderIdOrReceiverIdOrderByOccurredAtDesc(userId, userId);
        Set<Long> lookupIds = new LinkedHashSet<>();
        for (TransactionRecord record : records) {
            if (record.getSenderId() != null) {
                lookupIds.add(record.getSenderId());
            }
            if (record.getReceiverId() != null) {
                lookupIds.add(record.getReceiverId());
            }
        }

        Map<Long, UserLookupResponse> usersById = loadUsersById(lookupIds);

        return records.stream()
                .map(record -> mapRecord(userId, record, usersById))
                .toList();
    }

    private TransactionHistoryItemDto mapRecord(Long currentUserId,
                                                TransactionRecord record,
                                                Map<Long, UserLookupResponse> usersById) {
        TransactionHistoryItemDto item = new TransactionHistoryItemDto();
        item.setId(record.getId());
        item.setSenderId(record.getSenderId());
        item.setReceiverId(record.getReceiverId());
        item.setAmount(record.getAmount());
        item.setType(record.getType());
        item.setStatus(record.getStatus());
        item.setDateTime(record.getOccurredAt());

        boolean currentUserIsSender = currentUserId.equals(record.getSenderId());
        boolean currentUserIsReceiver = currentUserId.equals(record.getReceiverId());

        String typeLabel;
        String summary;
        String description;
        String fromLabel;
        String toLabel;
        String impactType;
        String impactLabel;
        String detailLine;

        switch (record.getType()) {
            case "ADD_MONEY" -> {
                typeLabel = "Wallet top-up";
                summary = "Added to wallet";
                description = "Funds were added directly to your wallet.";
                fromLabel = "Direct deposit";
                toLabel = "Your wallet";
                impactType = "CREDIT";
                impactLabel = "Credit";
                detailLine = "Direct deposit -> Wallet";
            }
            case "ADD_FROM_BANK" -> {
                typeLabel = "Add money";
                summary = "Added from bank";
                description = "Money was added from your linked bank account.";
                fromLabel = "Linked bank account";
                toLabel = "Your wallet";
                impactType = "CREDIT";
                impactLabel = "Credit";
                detailLine = "Linked bank account -> Wallet";
            }
            case "SELF_TRANSFER" -> {
                typeLabel = "Transfer";
                summary = "Transfer between linked accounts";
                description = "Money was moved between two of your linked accounts.";
                fromLabel = "Linked account";
                toLabel = "Linked account";
                impactType = "INTERNAL";
                impactLabel = "Internal transfer";
                detailLine = "Linked account -> Linked account";
            }
            case "WITHDRAW_TO_BANK" -> {
                typeLabel = "Withdrawal";
                summary = "Withdrawn to bank";
                description = "Money was moved from your wallet to your linked bank account.";
                fromLabel = "Your wallet";
                toLabel = "Linked bank account";
                impactType = "DEBIT";
                impactLabel = "Debit";
                detailLine = "Wallet -> Linked bank account";
            }
            case "WALLET_TRANSFER" -> {
                if (currentUserIsSender) {
                    String receiverLabel = resolveUserLabel(record.getReceiverId(), usersById);
                    typeLabel = "Payment sent";
                    summary = "Sent to " + receiverLabel;
                    description = "Wallet payment sent to another user.";
                    fromLabel = "Your wallet";
                    toLabel = receiverLabel;
                    impactType = "DEBIT";
                    impactLabel = "Debit";
                    detailLine = "Wallet -> " + receiverLabel;
                } else {
                    String senderLabel = resolveUserLabel(record.getSenderId(), usersById);
                    typeLabel = "Payment received";
                    summary = "Received from " + senderLabel;
                    description = "Wallet payment received from another user.";
                    fromLabel = senderLabel;
                    toLabel = "Your wallet";
                    impactType = "CREDIT";
                    impactLabel = "Credit";
                    detailLine = senderLabel + " -> Wallet";
                }
            }
            default -> {
                typeLabel = humanize(record.getType());
                fromLabel = currentUserIsSender ? "Your account" : resolveUserLabel(record.getSenderId(), usersById);
                toLabel = currentUserIsReceiver ? "Your account" : resolveUserLabel(record.getReceiverId(), usersById);
                impactType = currentUserIsSender && !currentUserIsReceiver ? "DEBIT"
                        : currentUserIsReceiver && !currentUserIsSender ? "CREDIT"
                        : "INTERNAL";
                impactLabel = "DEBIT".equals(impactType) ? "Debit"
                        : "CREDIT".equals(impactType) ? "Credit"
                        : "Internal transfer";
                summary = typeLabel;
                description = "Transaction recorded in your account history.";
                detailLine = fromLabel + " -> " + toLabel;
            }
        }

        item.setTypeLabel(typeLabel);
        item.setSummary(summary);
        item.setDescription(description);
        item.setFromLabel(fromLabel);
        item.setToLabel(toLabel);
        item.setImpactType(impactType);
        item.setImpactLabel(impactLabel);
        item.setDetailLine(detailLine);
        return item;
    }

    private String resolveUserLabel(Long userId, Map<Long, UserLookupResponse> usersById) {
        if (userId == null) {
            return "Unknown";
        }
        UserLookupResponse user = usersById.get(userId);
        if (user == null) {
            return "User ID " + userId;
        }
        if (hasText(user.name()) && hasText(user.username())) {
            return user.name() + " (@" + user.username() + ")";
        }
        if (hasText(user.username())) {
            return "@" + user.username();
        }
        if (hasText(user.name())) {
            return user.name();
        }
        return "User ID " + userId;
    }

    private String humanize(String value) {
        if (!hasText(value)) {
            return "Transaction";
        }
        String[] parts = value.toLowerCase(Locale.ENGLISH).split("_");
        StringBuilder builder = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(part.charAt(0)));
            if (part.length() > 1) {
                builder.append(part.substring(1));
            }
        }
        return builder.toString();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private Map<Long, UserLookupResponse> loadUsersById(Set<Long> lookupIds) {
        try {
            return userServiceClient.lookupUsers(List.copyOf(lookupIds)).stream()
                    .collect(Collectors.toMap(UserLookupResponse::id, Function.identity()));
        } catch (FeignException ex) {
            return Map.of();
        }
    }

    private WalletOperationEvent deserialize(String payload) {
        try {
            return objectMapper.readValue(payload, WalletOperationEvent.class);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Received an invalid ActiveMQ event payload.", ex);
        }
    }
}
