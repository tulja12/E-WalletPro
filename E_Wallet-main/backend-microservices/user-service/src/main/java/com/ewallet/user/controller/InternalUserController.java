package com.ewallet.user.controller;

import com.ewallet.user.dto.InternalUserResponse;
import com.ewallet.user.dto.MfaUpdateRequest;
import com.ewallet.user.dto.PasswordResetRequest;
import com.ewallet.user.dto.SignupRequest;
import com.ewallet.user.dto.UserLookupResponse;
import com.ewallet.user.dto.UserRegistrationResponse;
import com.ewallet.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/internal/users")
public class InternalUserController {

    private final UserService userService;

    public InternalUserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserRegistrationResponse> register(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(userService.register(request));
    }

    @GetMapping("/by-username/{username}")
    public ResponseEntity<InternalUserResponse> getByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getInternalUserByUsername(username));
    }

    @PutMapping("/{userId}/mfa")
    public ResponseEntity<InternalUserResponse> updateMfa(@PathVariable Long userId,
                                                          @RequestBody MfaUpdateRequest request) {
        return ResponseEntity.ok(userService.updateMfa(userId, request));
    }

    @PutMapping("/{userId}/password-reset")
    public ResponseEntity<Void> resetPassword(@PathVariable Long userId,
                                              @Valid @RequestBody PasswordResetRequest request) {
        userService.resetPassword(userId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/lookup")
    public ResponseEntity<List<UserLookupResponse>> lookupUsers(@RequestBody List<Long> userIds) {
        return ResponseEntity.ok(userService.lookupUsers(userIds));
    }
}
