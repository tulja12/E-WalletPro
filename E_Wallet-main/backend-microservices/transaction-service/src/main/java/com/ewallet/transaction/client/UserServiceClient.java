package com.ewallet.transaction.client;

import com.ewallet.transaction.dto.InternalUserResponse;
import com.ewallet.transaction.dto.UserLookupResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "user-service")
public interface UserServiceClient {

    @GetMapping("/internal/users/by-username/{username}")
    InternalUserResponse getByUsername(@PathVariable("username") String username);

    @PostMapping("/internal/users/lookup")
    List<UserLookupResponse> lookupUsers(@RequestBody List<Long> userIds);
}
