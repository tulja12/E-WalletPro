package com.ewallet.controller;

import com.ewallet.dto.TransactionHistoryItemDto;
import com.ewallet.model.User;
import com.ewallet.repository.UserRepository;
import com.ewallet.service.TransactionHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/transactions")
@CrossOrigin(origins = "http://localhost:5173")
public class TransactionController {

    private final UserRepository userRepository;
    private final TransactionHistoryService transactionHistoryService;

    public TransactionController(UserRepository userRepository,
                                 TransactionHistoryService transactionHistoryService) {
        this.userRepository = userRepository;
        this.transactionHistoryService = transactionHistoryService;
    }

    @GetMapping
    public ResponseEntity<List<TransactionHistoryItemDto>> getTransactions(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName());
        return ResponseEntity.ok(transactionHistoryService.getHistoryForUser(user));
    }

    @PostMapping("/email-history")
    public ResponseEntity<Map<String, String>> emailTransactionHistory(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName());

        try {
            transactionHistoryService.emailHistoryToUser(user);
            return ResponseEntity.ok(Map.of(
                    "message", "Transaction history sent to " + user.getEmail()
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(500).body(Map.of("message", ex.getMessage()));
        }
    }
}
