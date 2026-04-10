package com.ewallet.auth.client;

import com.ewallet.auth.dto.InternalUserDto;
import com.ewallet.auth.dto.MfaUpdateRequest;
import com.ewallet.auth.dto.PasswordResetRequest;
import com.ewallet.auth.dto.SignupRequest;
import com.ewallet.auth.dto.UserRegistrationResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "user-service")
public interface UserServiceClient {

    @PostMapping("/internal/users/register")
    UserRegistrationResponse register(@RequestBody SignupRequest request);

    @GetMapping("/internal/users/by-username/{username}")
    InternalUserDto getByUsername(@PathVariable("username") String username);

    @PutMapping("/internal/users/{userId}/mfa")
    InternalUserDto updateMfa(@PathVariable("userId") Long userId, @RequestBody MfaUpdateRequest request);

    @PutMapping("/internal/users/{userId}/password-reset")
    void resetPassword(@PathVariable("userId") Long userId, @RequestBody PasswordResetRequest request);
}
