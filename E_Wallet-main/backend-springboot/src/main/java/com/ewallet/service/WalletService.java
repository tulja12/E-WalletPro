package com.ewallet.service;

import com.ewallet.model.BankAccount;
import com.ewallet.model.Transaction;
import com.ewallet.model.User;
import com.ewallet.model.Wallet;
import com.ewallet.repository.AccountRepository;
import com.ewallet.repository.TransactionRepository;
import com.ewallet.repository.UserRepository;
import com.ewallet.repository.WalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    public WalletService(WalletRepository walletRepository,
                         UserRepository userRepository,
                         AccountRepository accountRepository,
                         TransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
    }

    public Wallet getWalletByUserId(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId);
        if (wallet == null) {
            wallet = new Wallet();
            wallet.setUserId(userId);
            wallet.setBalance(0.0);
            return walletRepository.save(wallet);
        }
        return wallet;
    }

    @Transactional
    public void addMoneyDirect(Long userId, Double amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Invalid amount");
        }
        Wallet wallet = getWalletByUserId(userId);
        wallet.setBalance(wallet.getBalance() + amount);
        walletRepository.save(wallet);

        Transaction txn = new Transaction();
        txn.setSender(null);
        txn.setReceiver(userId);
        txn.setAmount(amount);
        txn.setType("ADD_MONEY");
        txn.setStatus("SUCCESS");
        txn.setDateTime(LocalDateTime.now());
        transactionRepository.save(txn);
    }

    @Transactional
    public void addFromAccount(Long userId, Long accountId, Double amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Invalid amount");
        }
        BankAccount account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!account.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized account access");
        }

        if (account.getBalance() < amount) {
            throw new RuntimeException("Insufficient bank balance");
        }

        account.setBalance(account.getBalance() - amount);
        accountRepository.save(account);

        Wallet wallet = getWalletByUserId(userId);
        wallet.setBalance(wallet.getBalance() + amount);
        walletRepository.save(wallet);

        Transaction txn = new Transaction();
        txn.setSender(account.getUserId());
        txn.setReceiver(userId);
        txn.setAmount(amount);
        txn.setType("ADD_FROM_BANK");
        txn.setStatus("SUCCESS");
        txn.setDateTime(LocalDateTime.now());
        transactionRepository.save(txn);
    }

    @Transactional
    public void selfTransfer(Long userId, Long fromId, Long toId, Double amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Invalid amount");
        }
        if (fromId.equals(toId)) {
            throw new IllegalArgumentException("Cannot transfer to same account");
        }

        BankAccount from = accountRepository.findById(fromId).orElseThrow(() -> new RuntimeException("From account not found"));
        BankAccount to = accountRepository.findById(toId).orElseThrow(() -> new RuntimeException("To account not found"));

        // 🛡️ IDOR Fix: Verify ownership
        if (!from.getUserId().equals(userId) || !to.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized account access");
        }

        if (from.getBalance() < amount) {
            throw new RuntimeException("Insufficient bank balance");
        }

        from.setBalance(from.getBalance() - amount);
        to.setBalance(to.getBalance() + amount);

        accountRepository.save(from);
        accountRepository.save(to);

        Transaction txn = new Transaction();
        txn.setSender(userId);
        txn.setReceiver(userId);
        txn.setAmount(amount);
        txn.setType("SELF_TRANSFER");
        txn.setStatus("SUCCESS");
        txn.setDateTime(LocalDateTime.now());
        transactionRepository.save(txn);
    }

    // 🚀 NEW: Peer to Peer Wallet Transfer
    @Transactional
    public Transaction transferWalletToWallet(Long senderId, String receiverUsername, Double amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Invalid amount");
        }

        String normalizedUsername = receiverUsername == null ? "" : receiverUsername.trim();
        if (normalizedUsername.isEmpty()) {
            throw new IllegalArgumentException("Receiver username is required");
        }

        User receiver = userRepository.findByUsername(normalizedUsername);
        if (receiver == null) {
            throw new RuntimeException("Receiver username not found");
        }

        if (senderId.equals(receiver.getId())) {
            throw new IllegalArgumentException("Cannot transfer to yourself this way");
        }

        Wallet senderWallet = getWalletByUserId(senderId);
        Wallet receiverWallet = getWalletByUserId(receiver.getId());

        if (senderWallet.getBalance() < amount) {
            throw new RuntimeException("Insufficient wallet balance");
        }

        senderWallet.setBalance(senderWallet.getBalance() - amount);
        receiverWallet.setBalance(receiverWallet.getBalance() + amount);

        walletRepository.save(senderWallet);
        walletRepository.save(receiverWallet);

        Transaction txn = new Transaction();
        txn.setSender(senderId);
        txn.setReceiver(receiver.getId());
        txn.setAmount(amount);
        txn.setType("WALLET_TRANSFER");
        txn.setStatus("SUCCESS");
        txn.setDateTime(LocalDateTime.now());
        return transactionRepository.save(txn);
    }
    
    // 🚀 NEW: Withdraw to bank
    @Transactional
    public void withdrawToBank(Long userId, Long accountId, Double amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Invalid amount");
        }
        
        BankAccount account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!account.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized account access");
        }

        Wallet wallet = getWalletByUserId(userId);
        if (wallet.getBalance() < amount) {
            throw new RuntimeException("Insufficient wallet balance");
        }

        wallet.setBalance(wallet.getBalance() - amount);
        walletRepository.save(wallet);
        
        account.setBalance(account.getBalance() + amount);
        accountRepository.save(account);

        Transaction txn = new Transaction();
        txn.setSender(userId);
        txn.setReceiver(account.getUserId());
        txn.setAmount(amount);
        txn.setType("WITHDRAW_TO_BANK");
        txn.setStatus("SUCCESS");
        txn.setDateTime(LocalDateTime.now());
        transactionRepository.save(txn);
    }

}
