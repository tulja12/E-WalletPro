package com.ewallet.wallet.client;

import com.ewallet.wallet.dto.InternalUserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service")
public interface UserServiceClient {

    @GetMapping("/internal/users/by-username/{username}")
    InternalUserResponse getByUsername(@PathVariable("username") String username);
}
