package com.ewallet.user.service;

import com.ewallet.user.client.WalletServiceClient;
import com.ewallet.user.config.MessagingConfig;
import com.ewallet.user.dto.AdminUserDetailResponse;
import com.ewallet.user.dto.AdminUserListItem;
import com.ewallet.user.dto.BankAccountResponse;
import com.ewallet.user.dto.ChangeEmailRequest;
import com.ewallet.user.dto.ChangePasswordRequest;
import com.ewallet.user.dto.InternalUserResponse;
import com.ewallet.user.dto.MfaUpdateRequest;
import com.ewallet.user.dto.PasswordResetRequest;
import com.ewallet.user.dto.SignupRequest;
import com.ewallet.user.dto.UserLookupResponse;
import com.ewallet.user.dto.UserProfileResponse;
import com.ewallet.user.dto.UserRegistrationResponse;
import com.ewallet.user.dto.WalletSnapshotResponse;
import com.ewallet.user.entity.UserEntity;
import com.ewallet.user.entity.UserRoleEntity;
import com.ewallet.user.exception.ApiException;
import com.ewallet.user.event.UserRegisteredEvent;
import com.ewallet.user.repository.UserRepository;
import com.ewallet.user.repository.UserRoleRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import org.springframework.jms.JmsException;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JmsTemplate jmsTemplate;
    private final WalletServiceClient walletServiceClient;
    private final ObjectMapper objectMapper;

    public UserService(UserRepository userRepository,
                       UserRoleRepository userRoleRepository,
                       PasswordEncoder passwordEncoder,
                       JmsTemplate jmsTemplate,
                       WalletServiceClient walletServiceClient,
                       ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jmsTemplate = jmsTemplate;
        this.walletServiceClient = walletServiceClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UserRegistrationResponse register(SignupRequest request) {
        String username = normalize(request.username());
        String email = normalize(request.email());
        String password = normalize(request.passkey());
        if (username.isBlank()) {
            throw ApiException.badRequest("Username is required");
        }
        if (email.isBlank()) {
            throw ApiException.badRequest("Email is required");
        }
        if (password.isBlank()) {
            throw ApiException.badRequest("Password is required");
        }
        if (userRepository.existsByUsername(username)) {
            throw ApiException.conflict("Username already exists");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email already exists");
        }

        UserEntity user = new UserEntity();
        user.setName(defaultString(request.name()));
        user.setEmail(email);
        user.setPhone(defaultString(request.phone()));
        user.setUsername(username);
        user.setPasskey(passwordEncoder.encode(password));
        user.setBlocked(false);
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setBalance(BigDecimal.ZERO);

        UserEntity saved = userRepository.save(user);
        ensureRole(saved, "USER");

        publishUserRegisteredEvent(saved);

        return new UserRegistrationResponse(saved.getId(), saved.getUsername(), resolveRole(saved));
    }

    @Transactional
    public UserEntity registerAdmin(UserEntity admin) {
        String email = normalize(admin.getEmail());
        if (!email.isBlank() && userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email already exists");
        }
        admin.setEmail(email);
        admin.setUsername(normalize(admin.getUsername()));
        admin.setPasskey(passwordEncoder.encode(defaultString(admin.getPasskey())));
        admin.setBlocked(false);
        admin.setMfaEnabled(false);
        admin.setMfaSecret(null);
        admin.setBalance(BigDecimal.ZERO);
        return userRepository.save(admin);
    }

    public UserProfileResponse getUserProfile(String username) {
        UserEntity user = findByUsername(username);
        return new UserProfileResponse(
                user.getUsername(),
                user.getEmail(),
                user.isMfaEnabled(),
                user.isBlocked(),
                resolveRole(user)
        );
    }

    @Transactional
    public Map<String, String> changeEmail(String username, ChangeEmailRequest request) {
        UserEntity user = findByUsername(username);
        String email = normalize(request.email());
        if (!email.equalsIgnoreCase(defaultString(user.getEmail()))
                && userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email already exists");
        }
        user.setEmail(email);
        userRepository.save(user);
        return Map.of("message", "Email updated successfully");
    }

    @Transactional
    public Map<String, String> changePassword(String username, ChangePasswordRequest request) {
        UserEntity user = findByUsername(username);
        if (!passwordEncoder.matches(defaultString(request.currentPassword()), user.getPasskey())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        if (passwordEncoder.matches(defaultString(request.newPassword()), user.getPasskey())) {
            throw ApiException.badRequest("New password must be different from the current password");
        }
        user.setPasskey(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        return Map.of("message", "Password updated successfully");
    }

    public List<AdminUserListItem> getAdminUsers() {
        return userRepository.findAll().stream()
                .map(this::toAdminListItem)
                .filter(item -> !"ADMIN".equals(item.role()))
                .toList();
    }

    public AdminUserDetailResponse getAdminUserDetail(Long userId) {
        UserEntity user = findById(userId);
        String role = resolveRole(user);
        if ("ADMIN".equals(role)) {
            throw ApiException.forbidden("Admin details are not available here");
        }

        return new AdminUserDetailResponse(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                role,
                user.isMfaEnabled(),
                user.isBlocked(),
                safeWalletBalance(user.getId()),
                safeAccounts(user.getId())
        );
    }

    @Transactional
    public Map<String, Object> updateAdminUserMfa(Long userId, Boolean enabled) {
        UserEntity user = findById(userId);
        String role = resolveRole(user);
        if ("ADMIN".equals(role)) {
            throw ApiException.forbidden("Admin MFA cannot be changed here");
        }
        if (enabled && isBlank(user.getMfaSecret())) {
            throw ApiException.badRequest(
                    "This user has not configured an MFA secret yet. Ask the user to set up MFA first.");
        }
        user.setMfaEnabled(enabled);
        userRepository.save(user);
        return Map.of(
                "message", enabled ? "MFA enabled for user" : "MFA disabled for user",
                "mfaEnabled", user.isMfaEnabled()
        );
    }

    @Transactional
    public Map<String, Object> updateAdminUserBlocked(Long userId, Boolean blocked) {
        UserEntity user = findById(userId);
        String role = resolveRole(user);
        if ("ADMIN".equals(role)) {
            throw ApiException.forbidden("Admin accounts cannot be blocked here");
        }
        user.setBlocked(blocked);
        userRepository.save(user);
        return Map.of(
                "message", blocked ? "User blocked successfully" : "User unblocked successfully",
                "blocked", user.isBlocked()
        );
    }

    public InternalUserResponse getInternalUserByUsername(String username) {
        return toInternalResponse(findByUsername(username));
    }

    @Transactional
    public InternalUserResponse updateMfa(Long userId, MfaUpdateRequest request) {
        UserEntity user = findById(userId);
        user.setMfaEnabled(request.enabled());
        user.setMfaSecret(request.secret());
        return toInternalResponse(userRepository.save(user));
    }

    @Transactional
    public void resetPassword(Long userId, PasswordResetRequest request) {
        UserEntity user = findById(userId);
        if (passwordEncoder.matches(defaultString(request.newPassword()), user.getPasskey())) {
            throw ApiException.badRequest("New password must be different from the current password");
        }
        user.setPasskey(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    public List<UserLookupResponse> lookupUsers(List<Long> userIds) {
        return userRepository.findAllById(userIds).stream()
                .map(user -> new UserLookupResponse(
                        user.getId(),
                        user.getName(),
                        user.getUsername(),
                        user.getEmail(),
                        resolveRole(user),
                        user.isBlocked()
                ))
                .collect(Collectors.toList());
    }

    public Optional<UserEntity> findByUsernameOptional(String username) {
        return userRepository.findByUsername(normalize(username));
    }

    public UserEntity findByUsername(String username) {
        return userRepository.findByUsername(normalize(username))
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    public UserEntity findById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    public void ensureRole(UserEntity user, String roleType) {
        UserRoleEntity userRole = userRoleRepository.findByUserId(user.getId()).orElseGet(UserRoleEntity::new);
        userRole.setUserId(user.getId());
        userRole.setRoleType(roleType);
        userRoleRepository.save(userRole);
    }

    private AdminUserListItem toAdminListItem(UserEntity user) {
        String role = resolveRole(user);
        return new AdminUserListItem(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                role,
                user.isMfaEnabled(),
                user.isBlocked(),
                safeWalletBalance(user.getId())
        );
    }

    private InternalUserResponse toInternalResponse(UserEntity user) {
        return new InternalUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getUsername(),
                user.getPasskey(),
                user.isMfaEnabled(),
                user.getMfaSecret(),
                user.isBlocked(),
                resolveRole(user)
        );
    }

    private String resolveRole(UserEntity user) {
        return userRoleRepository.findByUserId(user.getId())
                .map(UserRoleEntity::getRoleType)
                .orElse("USER");
    }

    private BigDecimal safeWalletBalance(Long userId) {
        try {
            WalletSnapshotResponse response = walletServiceClient.getWalletByUserId(userId);
            return response.balance() == null ? BigDecimal.ZERO : response.balance();
        } catch (FeignException ex) {
            return BigDecimal.ZERO;
        }
    }

    private List<BankAccountResponse> safeAccounts(Long userId) {
        try {
            return walletServiceClient.getAccountsByUserId(userId);
        } catch (FeignException ex) {
            return List.of();
        }
    }

    private String normalize(String value) {
        return defaultString(value).trim();
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void publishUserRegisteredEvent(UserEntity saved) {
        try {
            jmsTemplate.convertAndSend(
                    MessagingConfig.USER_REGISTERED_QUEUE,
                    objectMapper.writeValueAsString(
                            new UserRegisteredEvent(saved.getId(), saved.getUsername(), saved.getEmail()))
            );
        } catch (JmsException | JsonProcessingException ex) {
            throw ApiException.serviceUnavailable("ActiveMQ is unavailable. Please try again in a moment.");
        }
    }
}
