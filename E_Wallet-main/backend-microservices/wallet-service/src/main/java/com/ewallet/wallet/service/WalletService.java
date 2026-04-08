package com.ewallet.wallet.service;

import com.ewallet.wallet.config.MessagingConfig;
import com.ewallet.wallet.dto.AccountWalletOperationRequest;
import com.ewallet.wallet.dto.AmountOperationRequest;
import com.ewallet.wallet.dto.BankAccountRequest;
import com.ewallet.wallet.dto.BankAccountResponse;
import com.ewallet.wallet.dto.SelfTransferOperationRequest;
import com.ewallet.wallet.dto.WalletOperationResponse;
import com.ewallet.wallet.dto.WalletSnapshotResponse;
import com.ewallet.wallet.dto.WalletTransferOperationRequest;
import com.ewallet.wallet.entity.BankAccountEntity;
import com.ewallet.wallet.entity.WalletEntity;
import com.ewallet.wallet.exception.ApiException;
import com.ewallet.wallet.event.UserRegisteredEvent;
import com.ewallet.wallet.event.WalletOperationEvent;
import com.ewallet.wallet.repository.BankAccountRepository;
import com.ewallet.wallet.repository.WalletRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jms.JmsException;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final BankAccountRepository bankAccountRepository;
    private final JmsTemplate jmsTemplate;
    private final ObjectMapper objectMapper;
    private final PasswordEncoder passwordEncoder;

    public WalletService(WalletRepository walletRepository,
                         BankAccountRepository bankAccountRepository,
                         JmsTemplate jmsTemplate,
                         ObjectMapper objectMapper,
                         PasswordEncoder passwordEncoder) {
        this.walletRepository = walletRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.jmsTemplate = jmsTemplate;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public WalletEntity getOrCreateWallet(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseGet(() -> {
                    WalletEntity wallet = new WalletEntity();
                    wallet.setUserId(userId);
                    wallet.setBalance(BigDecimal.ZERO);
                    return walletRepository.save(wallet);
                });
    }

    public WalletSnapshotResponse getWalletSnapshot(Long userId) {
        WalletEntity wallet = getOrCreateWallet(userId);
        return new WalletSnapshotResponse(wallet.getUserId(), wallet.getBalance());
    }

    public List<BankAccountResponse> getAccounts(Long userId) {
        return bankAccountRepository.findByUserId(userId).stream().map(this::toAccountResponse).toList();
    }

    @Transactional
    public BankAccountResponse addAccount(Long userId, BankAccountRequest request) {
        BankAccountEntity entity = new BankAccountEntity();
        entity.setUserId(userId);
        entity.setBankName(requiredText(request.bankName(), "Bank name is required"));
        entity.setCardNumber(normalizeCardNumber(request.cardNumber()));
        entity.setAccountHolder(requiredText(request.accountHolder(), "Account holder is required"));
        entity.setPinHash(passwordEncoder.encode(normalizePin(request.pin(), true)));
        entity.setBalance(normalizeAmount(request.balance()));
        return toAccountResponse(bankAccountRepository.save(entity));
    }

    @Transactional
    public BankAccountResponse updateAccount(Long userId, Long accountId, BankAccountRequest request) {
        BankAccountEntity entity = ownedAccount(userId, accountId);
        entity.setBankName(requiredText(request.bankName(), "Bank name is required"));
        entity.setCardNumber(normalizeCardNumber(request.cardNumber()));
        entity.setAccountHolder(requiredText(request.accountHolder(), "Account holder is required"));
        if (request.pin() != null && !request.pin().trim().isEmpty()) {
            entity.setPinHash(passwordEncoder.encode(normalizePin(request.pin(), true)));
        }
        entity.setBalance(normalizeAmount(request.balance()));
        return toAccountResponse(bankAccountRepository.save(entity));
    }

    @Transactional
    public void deleteAccount(Long userId, Long accountId) {
        bankAccountRepository.delete(ownedAccount(userId, accountId));
    }

    @Transactional
    public WalletOperationResponse addMoney(AmountOperationRequest request) {
        WalletEntity wallet = getOrCreateWallet(request.userId());
        BigDecimal amount = positiveAmount(request.amount());
        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);
        String referenceId = publishWalletEvent(null, request.userId(), amount, "ADD_MONEY");
        return new WalletOperationResponse(referenceId, wallet.getBalance());
    }

    @Transactional
    public WalletOperationResponse addFromAccount(AccountWalletOperationRequest request) {
        BigDecimal amount = positiveAmount(request.amount());
        BankAccountEntity account = ownedAccount(request.userId(), request.accountId());
        verifyAccountPin(account, request.pin());
        if (account.getBalance().compareTo(amount) < 0) {
            throw ApiException.badRequest("Insufficient bank balance");
        }
        WalletEntity wallet = getOrCreateWallet(request.userId());
        account.setBalance(account.getBalance().subtract(amount));
        wallet.setBalance(wallet.getBalance().add(amount));
        bankAccountRepository.save(account);
        walletRepository.save(wallet);
        String referenceId = publishWalletEvent(request.userId(), request.userId(), amount, "ADD_FROM_BANK");
        return new WalletOperationResponse(referenceId, wallet.getBalance());
    }

    @Transactional
    public WalletOperationResponse withdraw(AccountWalletOperationRequest request) {
        BigDecimal amount = positiveAmount(request.amount());
        BankAccountEntity account = ownedAccount(request.userId(), request.accountId());
        WalletEntity wallet = getOrCreateWallet(request.userId());
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw ApiException.badRequest("Insufficient wallet balance");
        }
        wallet.setBalance(wallet.getBalance().subtract(amount));
        account.setBalance(account.getBalance().add(amount));
        walletRepository.save(wallet);
        bankAccountRepository.save(account);
        String referenceId = publishWalletEvent(request.userId(), request.userId(), amount, "WITHDRAW_TO_BANK");
        return new WalletOperationResponse(referenceId, wallet.getBalance());
    }

    @Transactional
    public WalletOperationResponse selfTransfer(SelfTransferOperationRequest request) {
        BigDecimal amount = positiveAmount(request.amount());
        if (Objects.equals(request.fromAccountId(), request.toAccountId())) {
            throw ApiException.badRequest("Cannot transfer to the same account");
        }
        BankAccountEntity from = ownedAccount(request.userId(), request.fromAccountId());
        BankAccountEntity to = ownedAccount(request.userId(), request.toAccountId());
        verifyAccountPin(from, request.pin());
        if (from.getBalance().compareTo(amount) < 0) {
            throw ApiException.badRequest("Insufficient bank balance");
        }
        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));
        bankAccountRepository.save(from);
        bankAccountRepository.save(to);
        String referenceId = publishWalletEvent(request.userId(), request.userId(), amount, "SELF_TRANSFER");
        return new WalletOperationResponse(referenceId, getOrCreateWallet(request.userId()).getBalance());
    }

    @Transactional
    public WalletOperationResponse walletTransfer(WalletTransferOperationRequest request) {
        BigDecimal amount = positiveAmount(request.amount());
        if (request.senderUserId().equals(request.receiverUserId())) {
            throw ApiException.badRequest("Cannot transfer to yourself this way");
        }
        WalletEntity senderWallet = getOrCreateWallet(request.senderUserId());
        WalletEntity receiverWallet = getOrCreateWallet(request.receiverUserId());
        if (senderWallet.getBalance().compareTo(amount) < 0) {
            throw ApiException.badRequest("Insufficient wallet balance");
        }
        senderWallet.setBalance(senderWallet.getBalance().subtract(amount));
        receiverWallet.setBalance(receiverWallet.getBalance().add(amount));
        walletRepository.save(senderWallet);
        walletRepository.save(receiverWallet);
        String referenceId = publishWalletEvent(request.senderUserId(), request.receiverUserId(), amount, "WALLET_TRANSFER");
        return new WalletOperationResponse(referenceId, senderWallet.getBalance());
    }

    @JmsListener(destination = MessagingConfig.USER_REGISTERED_QUEUE)
    @Transactional
    public void createWalletForUser(String payload) {
        UserRegisteredEvent event = deserialize(payload, UserRegisteredEvent.class);
        getOrCreateWallet(event.userId());
    }

    private String publishWalletEvent(Long senderId, Long receiverId, BigDecimal amount, String type) {
        String referenceId = UUID.randomUUID().toString();
        try {
            jmsTemplate.convertAndSend(
                    MessagingConfig.WALLET_OPERATION_QUEUE,
                    objectMapper.writeValueAsString(
                            new WalletOperationEvent(referenceId, senderId, receiverId, amount, type, "SUCCESS", LocalDateTime.now()))
            );
        } catch (JmsException | JsonProcessingException ex) {
            throw ApiException.serviceUnavailable("ActiveMQ is unavailable. Please try again in a moment.");
        }
        return referenceId;
    }

    private BankAccountEntity ownedAccount(Long userId, Long accountId) {
        BankAccountEntity account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> ApiException.notFound("Account not found"));
        if (!account.getUserId().equals(userId)) {
            throw ApiException.forbidden("Unauthorized account access");
        }
        return account;
    }

    private BigDecimal positiveAmount(BigDecimal amount) {
        BigDecimal normalized = normalizeAmount(amount);
        if (normalized.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("Amount must be greater than zero");
        }
        return normalized;
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        return (amount == null ? BigDecimal.ZERO : amount).setScale(2, RoundingMode.HALF_UP);
    }

    private String requiredText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw ApiException.badRequest(message);
        }
        return value.trim();
    }

    private String normalizeCardNumber(String cardNumber) {
        String digits = requiredText(cardNumber, "Card number is required").replace(" ", "");
        if (digits.length() < 12 || digits.length() > 19 || !digits.chars().allMatch(Character::isDigit)) {
            throw ApiException.badRequest("Card number must contain 12 to 19 digits");
        }
        return digits;
    }

    private String normalizePin(String pin, boolean required) {
        String normalized = pin == null ? "" : pin.trim();
        if (normalized.isEmpty()) {
            if (required) {
                throw ApiException.badRequest("Account PIN is required");
            }
            return "";
        }
        if (normalized.length() != 4 || !normalized.chars().allMatch(Character::isDigit)) {
            throw ApiException.badRequest("Account PIN must contain exactly 4 digits");
        }
        return normalized;
    }

    private void verifyAccountPin(BankAccountEntity account, String rawPin) {
        if (account.getPinHash() == null || account.getPinHash().isBlank()) {
            throw ApiException.badRequest("Set a PIN for this bank account before using it");
        }
        if (!passwordEncoder.matches(normalizePin(rawPin, true), account.getPinHash())) {
            throw ApiException.badRequest("Invalid account PIN");
        }
    }

    private BankAccountResponse toAccountResponse(BankAccountEntity entity) {
        return new BankAccountResponse(
                entity.getId(),
                entity.getBankName(),
                entity.getCardNumber(),
                entity.getAccountHolder(),
                entity.getBalance(),
                entity.getPinHash() != null && !entity.getPinHash().isBlank()
        );
    }

    private <T> T deserialize(String payload, Class<T> targetType) {
        try {
            return objectMapper.readValue(payload, targetType);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Received an invalid ActiveMQ event payload.", ex);
        }
    }
}
