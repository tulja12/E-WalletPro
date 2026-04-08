package com.ewallet.user.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.jms.annotation.EnableJms;

@Configuration
@EnableJms
public class MessagingConfig {

    public static final String USER_REGISTERED_QUEUE = "ewallet.user.registered.queue";

    private MessagingConfig() {
    }
}
