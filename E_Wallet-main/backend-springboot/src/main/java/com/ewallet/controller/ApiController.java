package com.ewallet.controller;

import com.ewallet.jwt.JwtUtil;
import com.ewallet.model.User;
import com.ewallet.model.UserRole;
import com.ewallet.model.Wallet;
import com.ewallet.repository.UserRepository;
import com.ewallet.repository.UserRoleRepository;

import com.ewallet.repository.WalletRepository;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.code.HashingAlgorithm;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class ApiController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final WalletRepository walletRepository;


    public ApiController(AuthenticationManager authenticationManager,
                         UserRepository userRepository,
                         UserRoleRepository userRoleRepository,
                         PasswordEncoder passwordEncoder,
                         JwtUtil jwtUtil,
                         WalletRepository walletRepo) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.walletRepository = walletRepo ;
    }

    // ✅ SIGNUP
    @PostMapping("/signup")
    @Transactional
    public ResponseEntity<String> signup(@RequestBody User user) {
        String username = user.getUsername() == null ? "" : user.getUsername().trim();
        String password = user.getPasskey() == null ? "" : user.getPasskey().trim();

        if (username.isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required");
        }
        if (password.isEmpty()) {
            return ResponseEntity.badRequest().body("Password is required");
        }
        if (userRepository.findByUsername(username) != null) {
            return ResponseEntity.status(409).body("Username already exists");
        }

        user.setUsername(username);
        if (user.getName() != null) {
            user.setName(user.getName().trim());
        }
        if (user.getEmail() != null) {
            user.setEmail(user.getEmail().trim());
        }
        if (user.getPhone() != null) {
            user.setPhone(user.getPhone().trim());
        }

        System.out.println("Name: " + user.getName());
        System.out.println("Email: " + user.getEmail());
        System.out.println("Phone: " + user.getPhone());

        user.setPasskey(passwordEncoder.encode(password));
        user.setBalance(0.0);
        user.setBlocked(false);
        User savedUser = userRepository.save(user);

        UserRole userRole = new UserRole();
        userRole.setUserId(savedUser.getId());
        userRole.setRoleType("USER");
        userRoleRepository.save(userRole);

        Wallet wallet = new Wallet();
        wallet.setUserId(savedUser.getId());
        wallet.setBalance(0.0);
        walletRepository.save(wallet);

        return ResponseEntity.ok("User Registered");
    }

    // ✅ LOGIN
    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody User user) {

        User existingUser = userRepository.findByUsername(user.getUsername());

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            user.getUsername(),
                            user.getPasskey()
                    )
            );
        } catch (AuthenticationException ex) {
            if (existingUser != null && existingUser.isBlocked()) {
                return ResponseEntity.status(403).body(Map.of("message", "Your account has been blocked by admin"));
            }
            return ResponseEntity.status(401).body(Map.of("message", "Invalid username or password"));
        }

        User dbUser = existingUser != null ? existingUser : userRepository.findByUsername(user.getUsername());
        String roleType = resolveRole(dbUser.getId());

        System.out.println("MFA Enabled: " + dbUser.isMfaEnabled());
        System.out.println("User Id: " + dbUser.getId());

        if (dbUser.isMfaEnabled()) {

            String tempToken = jwtUtil.generateToken(user.getUsername());

            return ResponseEntity.ok(Map.of(
                    "mfaRequired", true,
                    "tempToken", tempToken,
                    "userId", dbUser.getId(),
                    "role", roleType
            ));
        }

        String token = jwtUtil.generateToken(user.getUsername());

        return ResponseEntity.ok(Map.of(
                "mfaRequired", false,
                "token", token,
                "userId", dbUser.getId(),
                "role", roleType
        ));
    }
    // ✅ ENABLE MFA
    @PostMapping("/auth/enable-mfa")
    public Map<String, String> enableMfa(Authentication auth) throws Exception {

        String username = auth.getName();

        User user = userRepository.findByUsername(username);

        // 🔐 generate secret
        DefaultSecretGenerator secretGenerator = new DefaultSecretGenerator();
        String secret = secretGenerator.generate();

        user.setMfaSecret(secret);
        user.setMfaEnabled(true);
        userRepository.save(user);

        QrData data = new QrData.Builder()
                .label(username)
                .secret(secret)
                .issuer("EWallet")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        ZxingPngQrGenerator generator = new ZxingPngQrGenerator();
        byte[] imageData = generator.generate(data);

        String qrBase64 = Base64.getEncoder().encodeToString(imageData);

        return Map.of(
                "secret", secret,
                "qrImage", qrBase64
        );
    }

    @PostMapping("/auth/disable-mfa")
    public Map<String, String> disableMfa(Authentication auth) {

        String username = auth.getName();

        User user = userRepository.findByUsername(username);

        user.setMfaEnabled(false);
        user.setMfaSecret(null);

        userRepository.save(user);

        return Map.of("message", "MFA Disabled");
    }

    @GetMapping("/auth/mfa-status")
    public Map<String, Boolean> getMfaStatus(Authentication auth) {

        String username = auth.getName();

        User user = userRepository.findByUsername(username);

        return Map.of("enabled", user.isMfaEnabled());
    }

    // ✅ VERIFY OTP
    @PostMapping("/auth/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> req) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing token"));
        }


        String token = authHeader.substring(7);
        String username = jwtUtil.extractUsername(token);

        String otp = req.get("otp");

        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        if (user.isBlocked()) {
            return ResponseEntity.status(403).body(Map.of("message", "Your account has been blocked by admin"));
        }

        System.out.println("Secret: " + user.getMfaSecret());
        System.out.println("OTP from user: " + otp);

        DefaultCodeGenerator generator =
                new DefaultCodeGenerator(HashingAlgorithm.SHA1);

        DefaultCodeVerifier verifier =
                new DefaultCodeVerifier(generator, new SystemTimeProvider());

        verifier.setAllowedTimePeriodDiscrepancy(1);

        boolean isValid = verifier.isValidCode(user.getMfaSecret(), otp);

        if (isValid) {
            String finalToken = jwtUtil.generateToken(username);
            String roleType = resolveRole(user.getId());
            return ResponseEntity.ok(Map.of(
                    "token", finalToken,
                    "userId", user.getId(),
                    "role", roleType
            ));
        }

        return ResponseEntity.status(400).body(Map.of("message", "Invalid OTP"));
    }



    @PutMapping("/user/change-password")
    public Map<String, Object> changePassword(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, String> req) {

        System.out.println("🔥 Change Password API called");

        try {

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return Map.of("message", "Missing token");
            }

            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);

            System.out.println("User: " + username);

            User user = userRepository.findByUsername(username);

            if (user == null) {
                return Map.of("message", "User not found");
            }

            String current = req.get("currentPassword");
            String newPass = req.get("newPassword");

            if (current == null || newPass == null) {
                return Map.of("message", "Invalid input");
            }

            // 🔥 IMPORTANT FIX
            if (!passwordEncoder.matches(current, user.getPasskey())) {
                return Map.of("message", "Wrong current password");
            }

            user.setPasskey(passwordEncoder.encode(newPass));
            userRepository.save(user);

            return Map.of("message", "Password updated successfully");

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("message", "Server error");
        }
    }

    @GetMapping("/user/details")
    public Map<String, Object> getUserDetails(Authentication auth) {
        String username = auth.getName();
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return Map.of("error", "User not found");
        }
        return Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "mfaEnabled", user.isMfaEnabled(),
                "blocked", user.isBlocked(),
                "role", resolveRole(user.getId())
        );
    }

    @PutMapping("/user/change-email")
    public Map<String, Object> changeEmail(Authentication auth, @RequestBody Map<String, String> req) {
        String username = auth.getName();
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return Map.of("error", "User not found");
        }
        String newEmail = req.get("email");
        if (newEmail == null || newEmail.trim().isEmpty()) {
            return Map.of("message", "Invalid email");
        }
        user.setEmail(newEmail);
        userRepository.save(user);
        return Map.of("message", "Email updated successfully");
    }

    private String resolveRole(Long userId) {
        UserRole userRole = userRoleRepository.findByUserId(userId).orElse(null);
        return userRole != null ? userRole.getRoleType() : "USER";
    }
}
