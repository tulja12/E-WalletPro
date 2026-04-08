package com.ewallet.service;

import com.ewallet.dto.TransactionHistoryItemDto;
import com.ewallet.model.Transaction;
import com.ewallet.model.User;
import com.ewallet.repository.TransactionRepository;
import com.ewallet.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.stream.Collectors;

@Service
public class TransactionHistoryService {

    private static final DateTimeFormatter EMAIL_DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy hh:mm a");
    private static final NumberFormat AMOUNT_FORMAT =
            NumberFormat.getCurrencyInstance(new Locale("en", "IN"));

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final String mailHost;
    private final String fromAddress;

    public TransactionHistoryService(TransactionRepository transactionRepository,
                                     UserRepository userRepository,
                                     JavaMailSender mailSender,
                                     @Value("${spring.mail.host:}") String mailHost,
                                     @Value("${app.mail.from:${spring.mail.username:no-reply@ewallet.local}}") String fromAddress) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
        this.mailHost = mailHost;
        this.fromAddress = fromAddress;
    }

    public List<TransactionHistoryItemDto> getHistoryForUser(User currentUser) {
        List<Transaction> transactions =
                transactionRepository.findBySenderOrReceiverOrderByDateTimeDesc(currentUser.getId(), currentUser.getId());

        Set<Long> userIds = new LinkedHashSet<>();
        for (Transaction transaction : transactions) {
            if (transaction.getSender() != null) {
                userIds.add(transaction.getSender());
            }
            if (transaction.getReceiver() != null) {
                userIds.add(transaction.getReceiver());
            }
        }

        Map<Long, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return transactions.stream()
                .map(transaction -> mapTransaction(currentUser, transaction, usersById))
                .toList();
    }

    public void emailHistoryToUser(User currentUser) {
        if (!hasText(currentUser.getEmail())) {
            throw new IllegalArgumentException("Add an email address to your profile before requesting transaction history.");
        }
        if (!hasText(mailHost)) {
            throw new IllegalStateException("Email service is not configured on the server.");
        }

        List<TransactionHistoryItemDto> history = getHistoryForUser(currentUser);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(hasText(fromAddress) ? fromAddress : "no-reply@ewallet.local");
        message.setTo(currentUser.getEmail());
        message.setSubject("Your E-Wallet transaction history");
        message.setText(buildEmailBody(currentUser, history));

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            throw new IllegalStateException("Unable to send the transaction history email right now.");
        }
    }

    private TransactionHistoryItemDto mapTransaction(User currentUser,
                                                     Transaction transaction,
                                                     Map<Long, User> usersById) {
        TransactionHistoryItemDto item = new TransactionHistoryItemDto();
        item.setId(transaction.getId());
        item.setSenderId(transaction.getSender());
        item.setReceiverId(transaction.getReceiver());
        item.setAmount(transaction.getAmount());
        item.setType(transaction.getType());
        item.setStatus(transaction.getStatus());
        item.setDateTime(transaction.getDateTime());

        String type = transaction.getType() == null ? "" : transaction.getType();
        boolean currentUserIsSender = currentUser.getId().equals(transaction.getSender());
        boolean currentUserIsReceiver = currentUser.getId().equals(transaction.getReceiver());

        String fromLabel;
        String toLabel;
        String typeLabel;
        String summary;
        String description;
        String impactType;
        String impactLabel;

        switch (type) {
            case "ADD_MONEY":
                typeLabel = "Wallet top-up";
                summary = "Money added directly to your wallet";
                description = "Funds were added straight into your wallet balance.";
                fromLabel = "Direct deposit";
                toLabel = "Your wallet";
                impactType = "CREDIT";
                impactLabel = "Credit";
                break;
            case "ADD_FROM_BANK":
                typeLabel = "Bank to wallet transfer";
                summary = "Money moved from your bank account to your wallet";
                description = "You funded your wallet using one of your linked bank accounts.";
                fromLabel = "Your bank account";
                toLabel = "Your wallet";
                impactType = "CREDIT";
                impactLabel = "Credit";
                break;
            case "SELF_TRANSFER":
                typeLabel = "Own account transfer";
                summary = "Money moved between your own bank accounts";
                description = "You transferred money between two bank accounts that belong to you.";
                fromLabel = "Your bank account";
                toLabel = "Your bank account";
                impactType = "INTERNAL";
                impactLabel = "Internal transfer";
                break;
            case "WITHDRAW_TO_BANK":
                typeLabel = "Wallet withdrawal";
                summary = "Money withdrawn from your wallet to your bank account";
                description = "You moved money out of your wallet and into your linked bank account.";
                fromLabel = "Your wallet";
                toLabel = "Your bank account";
                impactType = "DEBIT";
                impactLabel = "Debit";
                break;
            case "WALLET_TRANSFER":
                if (currentUserIsSender) {
                    String receiverLabel = resolveUserLabel(transaction.getReceiver(), usersById);
                    typeLabel = "Wallet transfer sent";
                    summary = "Money sent to " + receiverLabel;
                    description = "You transferred wallet funds to another user.";
                    fromLabel = "Your wallet";
                    toLabel = receiverLabel;
                    impactType = "DEBIT";
                    impactLabel = "Debit";
                } else {
                    String senderLabel = resolveUserLabel(transaction.getSender(), usersById);
                    typeLabel = "Wallet transfer received";
                    summary = "Money received from " + senderLabel;
                    description = "Another user transferred wallet funds to you.";
                    fromLabel = senderLabel;
                    toLabel = "Your wallet";
                    impactType = "CREDIT";
                    impactLabel = "Credit";
                }
                break;
            default:
                typeLabel = humanize(type);
                fromLabel = currentUserIsSender ? "Your account" : resolveUserLabel(transaction.getSender(), usersById);
                toLabel = currentUserIsReceiver ? "Your account" : resolveUserLabel(transaction.getReceiver(), usersById);
                impactType = currentUserIsSender && !currentUserIsReceiver ? "DEBIT"
                        : currentUserIsReceiver && !currentUserIsSender ? "CREDIT"
                        : "INTERNAL";
                impactLabel = "DEBIT".equals(impactType) ? "Debit"
                        : "CREDIT".equals(impactType) ? "Credit"
                        : "Internal transfer";
                summary = typeLabel;
                description = "Transaction recorded in your account history.";
                break;
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

    private String buildEmailBody(User currentUser, List<TransactionHistoryItemDto> history) {
        String recipientName = hasText(currentUser.getName()) ? currentUser.getName() : currentUser.getUsername();
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

    private String resolveUserLabel(Long userId, Map<Long, User> usersById) {
        if (userId == null) {
            return "Unknown";
        }

        User user = usersById.get(userId);
        if (user == null) {
            return "User ID " + userId;
        }

        if (hasText(user.getName()) && hasText(user.getUsername())) {
            return user.getName() + " (@" + user.getUsername() + ")";
        }
        if (hasText(user.getUsername())) {
            return "@" + user.getUsername();
        }
        if (hasText(user.getName())) {
            return user.getName();
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

    private String formatAmount(Double amount) {
        double safeAmount = amount == null ? 0.0 : amount;
        return AMOUNT_FORMAT.format(safeAmount);
    }

    private String formatDate(LocalDateTime dateTime) {
        return dateTime == null ? "NA" : dateTime.format(EMAIL_DATE_FORMAT);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
