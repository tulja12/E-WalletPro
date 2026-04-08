package com.ewallet.transaction.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.jms.annotation.EnableJms;

@Configuration
@EnableJms
public class MessagingConfig {

    public static final String WALLET_OPERATION_QUEUE = "ewallet.wallet.operation.queue";

    public MessagingConfig() {
    }
}
