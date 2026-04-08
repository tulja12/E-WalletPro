package com.ewallet.user.controller;

import com.ewallet.user.dto.AdminUserDetailResponse;
import com.ewallet.user.dto.AdminUserListItem;
import com.ewallet.user.dto.BlockedToggleRequest;
import com.ewallet.user.dto.ChangeEmailRequest;
import com.ewallet.user.dto.ChangePasswordRequest;
import com.ewallet.user.dto.MfaToggleRequest;
import com.ewallet.user.dto.UserProfileResponse;
import com.ewallet.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/user/details")
    public ResponseEntity<UserProfileResponse> getUserDetails(Authentication authentication) {
        return ResponseEntity.ok(userService.getUserProfile(authentication.getName()));
    }

    @PutMapping("/user/change-email")
    public ResponseEntity<Map<String, String>> changeEmail(Authentication authentication,
                                                          @Valid @RequestBody ChangeEmailRequest request) {
        return ResponseEntity.ok(userService.changeEmail(authentication.getName(), request));
    }

    @PutMapping("/user/change-password")
    public ResponseEntity<Map<String, String>> changePassword(Authentication authentication,
                                                              @Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(userService.changePassword(authentication.getName(), request));
    }

    @GetMapping("/admin/users")
    public ResponseEntity<List<AdminUserListItem>> getAdminUsers() {
        return ResponseEntity.ok(userService.getAdminUsers());
    }

    @GetMapping("/admin/users/{userId}")
    public ResponseEntity<AdminUserDetailResponse> getAdminUserDetail(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getAdminUserDetail(userId));
    }

    @PutMapping("/admin/users/{userId}/mfa")
    public ResponseEntity<Map<String, Object>> updateAdminMfa(@PathVariable Long userId,
                                                              @Valid @RequestBody MfaToggleRequest request) {
        return ResponseEntity.ok(userService.updateAdminUserMfa(userId, request.enabled()));
    }

    @PutMapping("/admin/users/{userId}/blocked")
    public ResponseEntity<Map<String, Object>> updateAdminBlocked(@PathVariable Long userId,
                                                                  @Valid @RequestBody BlockedToggleRequest request) {
        return ResponseEntity.ok(userService.updateAdminUserBlocked(userId, request.blocked()));
    }
}
