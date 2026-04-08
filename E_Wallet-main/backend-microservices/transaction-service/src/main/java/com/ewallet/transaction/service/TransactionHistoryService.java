package com.ewallet.transaction.service;

import com.ewallet.transaction.client.UserServiceClient;
import com.ewallet.transaction.dto.InternalUserResponse;
import com.ewallet.transaction.dto.TransactionHistoryItemDto;
import com.ewallet.transaction.dto.UserLookupResponse;
import com.ewallet.transaction.entity.TransactionRecord;
import com.ewallet.transaction.exception.ApiException;
import com.ewallet.transaction.event.WalletOperationEvent;
import com.ewallet.transaction.repository.TransactionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TransactionHistoryService {

    private static final DateTimeFormatter EMAIL_DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy hh:mm a");
    private static final NumberFormat AMOUNT_FORMAT =
            NumberFormat.getCurrencyInstance(new Locale("en", "IN"));

    private final TransactionRepository transactionRepository;
    private final UserServiceClient userServiceClient;
    private final JavaMailSender mailSender;
    private final String mailHost;
    private final String fromAddress;
    private final ObjectMapper objectMapper;

    public TransactionHistoryService(TransactionRepository transactionRepository,
                                     UserServiceClient userServiceClient,
                                     JavaMailSender mailSender,
                                     ObjectMapper objectMapper,
                                     @Value("${spring.mail.host:}") String mailHost,
                                     @Value("${app.mail.from:${spring.mail.username:no-reply@ewallet.local}}") String fromAddress) {
        this.transactionRepository = transactionRepository;
        this.userServiceClient = userServiceClient;
        this.mailSender = mailSender;
        this.objectMapper = objectMapper;
        this.mailHost = mailHost;
        this.fromAddress = fromAddress;
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

    public Map<String, String> emailHistory(Long userId, String username) {
        InternalUserResponse user;
        try {
            user = userServiceClient.getByUsername(username);
        } catch (FeignException ex) {
            throw translateFeignException(ex, "User details are unavailable right now.");
        }
        if (!hasText(user.email())) {
            throw ApiException.badRequest("Add an email address to your profile before requesting transaction history.");
        }
        if (!hasText(mailHost)) {
            throw ApiException.badGateway("Email service is not configured on the server.");
        }

        List<TransactionHistoryItemDto> history = getHistoryForUser(userId);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(hasText(fromAddress) ? fromAddress : "no-reply@ewallet.local");
        message.setTo(user.email());
        message.setSubject("Your E-Wallet transaction history");
        message.setText(buildEmailBody(user, history));

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            throw ApiException.badGateway("Unable to send the transaction history email right now.");
        }

        return Map.of("message", "Transaction history sent to " + user.email());
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

        switch (record.getType()) {
            case "ADD_MONEY" -> {
                typeLabel = "Wallet top-up";
                summary = "Money added directly to your wallet";
                description = "Funds were added straight into your wallet balance.";
                fromLabel = "Direct deposit";
                toLabel = "Your wallet";
                impactType = "CREDIT";
                impactLabel = "Credit";
            }
            case "ADD_FROM_BANK" -> {
                typeLabel = "Bank to wallet transfer";
                summary = "Money moved from your bank account to your wallet";
                description = "You funded your wallet using one of your linked bank accounts.";
                fromLabel = "Your bank account";
                toLabel = "Your wallet";
                impactType = "CREDIT";
                impactLabel = "Credit";
            }
            case "SELF_TRANSFER" -> {
                typeLabel = "Own account transfer";
                summary = "Money moved between your own bank accounts";
                description = "You transferred money between two bank accounts that belong to you.";
                fromLabel = "Your bank account";
                toLabel = "Your bank account";
                impactType = "INTERNAL";
                impactLabel = "Internal transfer";
            }
            case "WITHDRAW_TO_BANK" -> {
                typeLabel = "Wallet withdrawal";
                summary = "Money withdrawn from your wallet to your bank account";
                description = "You moved money out of your wallet and into your linked bank account.";
                fromLabel = "Your wallet";
                toLabel = "Your bank account";
                impactType = "DEBIT";
                impactLabel = "Debit";
            }
            case "WALLET_TRANSFER" -> {
                if (currentUserIsSender) {
                    String receiverLabel = resolveUserLabel(record.getReceiverId(), usersById);
                    typeLabel = "Wallet transfer sent";
                    summary = "Money sent to " + receiverLabel;
                    description = "You transferred wallet funds to another user.";
                    fromLabel = "Your wallet";
                    toLabel = receiverLabel;
                    impactType = "DEBIT";
                    impactLabel = "Debit";
                } else {
                    String senderLabel = resolveUserLabel(record.getSenderId(), usersById);
                    typeLabel = "Wallet transfer received";
                    summary = "Money received from " + senderLabel;
                    description = "Another user transferred wallet funds to you.";
                    fromLabel = senderLabel;
                    toLabel = "Your wallet";
                    impactType = "CREDIT";
                    impactLabel = "Credit";
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
            }
        }

        item.setTypeLabel(typeLabel);
        item.setSummary(summary);
        item.setDescription(description);
        item.setFromLabel(fromLabel);
        item.setToLabel(toLabel);
        item.setImpactType(impactType);
        item.setImpactLabel(impactLabel);
        item.setDetailLine("From " + fromLabel + " to " + toLabel);
        return item;
    }

    private String buildEmailBody(InternalUserResponse user, List<TransactionHistoryItemDto> history) {
        String recipientName = hasText(user.name()) ? user.name() : user.username();
        StringBuilder body = new StringBuilder();
        body.append("Hello ").append(recipientName).append(",\n\n");
        body.append("Here is your E-Wallet transaction history.\n\n");

        if (history.isEmpty()) {
            body.append("There are no transactions in your history yet.\n\n");
        } else {
            int index = 1;
            for (TransactionHistoryItemDto item : history) {
                body.append(index++).append(". ").append(item.getSummary()).append("\n");
                body.append("   Amount: ").append(formatAmount(item.getAmount())).append("\n");
                body.append("   Credit/Debit: ").append(item.getImpactLabel()).append("\n");
                body.append("   From: ").append(item.getFromLabel()).append("\n");
                body.append("   To: ").append(item.getToLabel()).append("\n");
                body.append("   Status: ").append(item.getStatus()).append("\n");
                body.append("   Date: ").append(formatDate(item.getDateTime())).append("\n\n");
            }
        }

        body.append("This is an automated email from E-Wallet.");
        return body.toString();
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

    private String formatAmount(java.math.BigDecimal amount) {
        return AMOUNT_FORMAT.format(amount == null ? java.math.BigDecimal.ZERO : amount);
    }

    private String formatDate(LocalDateTime dateTime) {
        return dateTime == null ? "NA" : dateTime.format(EMAIL_DATE_FORMAT);
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

    private ApiException translateFeignException(FeignException ex, String fallbackMessage) {
        HttpStatus status = HttpStatus.resolve(ex.status());
        String message = fallbackMessage;

        try {
            if (hasText(ex.contentUTF8())) {
                com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(ex.contentUTF8());
                if (node.hasNonNull("message")) {
                    message = node.get("message").asText();
                }
            }
        } catch (Exception ignored) {
            if (hasText(ex.getMessage())) {
                message = ex.getMessage();
            }
        }

        return status == null ? ApiException.badGateway(message) : ApiException.withStatus(status, message);
    }
}
