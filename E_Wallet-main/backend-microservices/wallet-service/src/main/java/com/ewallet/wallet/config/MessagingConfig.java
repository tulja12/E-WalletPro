package com.ewallet.wallet.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.jms.annotation.EnableJms;

@Configuration
@EnableJms
public class MessagingConfig {

    public static final String USER_REGISTERED_QUEUE = "ewallet.user.registered.queue";
    public static final String WALLET_OPERATION_QUEUE = "ewallet.wallet.operation.queue";

    public MessagingConfig() {
    }
}
