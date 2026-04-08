package com.ewallet.controller;

import com.ewallet.model.BankAccount;
import com.ewallet.model.Transaction;
import com.ewallet.repository.AccountRepository;
import com.ewallet.repository.TransactionRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/transfer")
@CrossOrigin(origins = "http://localhost:5173")
public class TransferController {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    public TransferController(AccountRepository accountRepository,
                              TransactionRepository transactionRepository) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
    }

    @PostMapping("/self")
    public ResponseEntity<?> selfTransfer(
            Authentication auth,
            @RequestBody Map<String, Object> body) {

        try {

            Long fromId = Long.valueOf(body.get("fromAccountId").toString());
            Long toId = Long.valueOf(body.get("toAccountId").toString());
            Double amount = Double.valueOf(body.get("amount").toString());

            if (amount <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Invalid amount"));
            }

            BankAccount from = accountRepository.findById(fromId)
                    .orElseThrow(() -> new RuntimeException("From account not found"));

            BankAccount to = accountRepository.findById(toId)
                    .orElseThrow(() -> new RuntimeException("To account not found"));

            // 🔐 SECURITY CHECK (IMPORTANT)
            if (!from.getUserId().equals(to.getUserId())) {
                return ResponseEntity.status(403)
                        .body(Map.of("message", "Accounts must belong to same user"));
            }

            if (from.getBalance() < amount) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Insufficient balance"));
            }

            // 🔻 Deduct
            from.setBalance(from.getBalance() - amount);

            // 🔺 Add
            to.setBalance(to.getBalance() + amount);

            accountRepository.save(from);
            accountRepository.save(to);

            // 🔥 SAVE TRANSACTION (FINAL PIECE)
            Transaction txn = new Transaction();
            txn.setSender(from.getUserId());
            txn.setReceiver(to.getUserId());
            txn.setAmount(amount);
            txn.setType("SELF_TRANSFER");
            txn.setStatus("SUCCESS");
            txn.setDateTime(LocalDateTime.now());

            transactionRepository.save(txn);

            return ResponseEntity.ok(
                    Map.of("message", "Transfer successful")
            );

        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                    Map.of("message", "Error: " + e.getMessage())
            );
        }
    }
}