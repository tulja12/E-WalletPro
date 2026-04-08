package com.ewallet.controller;

import com.ewallet.model.BankAccount;
import com.ewallet.model.User;
import com.ewallet.model.UserRole;
import com.ewallet.model.Wallet;
import com.ewallet.repository.AccountRepository;
import com.ewallet.repository.UserRepository;
import com.ewallet.repository.UserRoleRepository;
import com.ewallet.repository.WalletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final WalletRepository walletRepository;
    private final AccountRepository accountRepository;

    public AdminController(UserRepository userRepository,
                           UserRoleRepository userRoleRepository,
                           WalletRepository walletRepository,
                           AccountRepository accountRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.walletRepository = walletRepository;
        this.accountRepository = accountRepository;
    }

    @GetMapping("/users")
    public List<Map<String, Object>> getAllUsers() {
        List<Map<String, Object>> response = new ArrayList<>();

        for (User user : userRepository.findAll()) {
            String roleType = resolveRole(user.getId());
            if ("ADMIN".equals(roleType)) {
                continue;
            }

            Wallet wallet = walletRepository.findByUserId(user.getId());

            Map<String, Object> row = new HashMap<>();
            row.put("id", user.getId());
            row.put("name", user.getName());
            row.put("username", user.getUsername());
            row.put("email", user.getEmail());
            row.put("phone", user.getPhone());
            row.put("role", roleType);
            row.put("mfaEnabled", user.isMfaEnabled());
            row.put("blocked", user.isBlocked());
            row.put("walletBalance", wallet != null ? wallet.getBalance() : 0.0);
            response.add(row);
        }

        return response;
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserDetails(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        String roleType = resolveRole(user.getId());
        if ("ADMIN".equals(roleType)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin details are not available here"));
        }

        Wallet wallet = walletRepository.findByUserId(user.getId());
        List<BankAccount> bankAccounts = accountRepository.findByUserId(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("role", roleType);
        response.put("mfaEnabled", user.isMfaEnabled());
        response.put("blocked", user.isBlocked());
        response.put("walletBalance", wallet != null ? wallet.getBalance() : 0.0);
        response.put("bankAccounts", bankAccounts);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/users/{userId}/mfa")
    public ResponseEntity<?> updateUserMfa(@PathVariable Long userId,
                                           @RequestBody Map<String, Boolean> body) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        String roleType = resolveRole(user.getId());
        if ("ADMIN".equals(roleType)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin MFA cannot be changed here"));
        }

        Boolean enabled = body.get("enabled");
        if (enabled == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "MFA enabled flag is required"));
        }

        if (enabled && (user.getMfaSecret() == null || user.getMfaSecret().isBlank())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "This user has not configured an MFA secret yet. Ask the user to set up MFA first."
            ));
        }

        user.setMfaEnabled(enabled);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", enabled ? "MFA enabled for user" : "MFA disabled for user",
                "mfaEnabled", user.isMfaEnabled()
        ));
    }

    @PutMapping("/users/{userId}/blocked")
    public ResponseEntity<?> updateUserBlocked(@PathVariable Long userId,
                                               @RequestBody Map<String, Boolean> body) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        String roleType = resolveRole(user.getId());
        if ("ADMIN".equals(roleType)) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin accounts cannot be blocked here"));
        }

        Boolean blocked = body.get("blocked");
        if (blocked == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Blocked flag is required"));
        }

        user.setBlocked(blocked);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", blocked ? "User blocked successfully" : "User unblocked successfully",
                "blocked", user.isBlocked()
        ));
    }

    private String resolveRole(Long userId) {
        UserRole userRole = userRoleRepository.findByUserId(userId).orElse(null);
        return userRole != null ? userRole.getRoleType() : "USER";
    }
}
