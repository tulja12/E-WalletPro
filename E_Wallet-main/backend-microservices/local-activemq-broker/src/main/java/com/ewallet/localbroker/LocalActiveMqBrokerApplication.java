package com.ewallet.localbroker;

import org.apache.activemq.broker.BrokerService;

import java.util.concurrent.CountDownLatch;

public final class LocalActiveMqBrokerApplication {

    private static final String BROKER_URL = "tcp://0.0.0.0:61616";

    private LocalActiveMqBrokerApplication() {
    }

    public static void main(String[] args) throws Exception {
        BrokerService broker = new BrokerService();
        broker.setBrokerName("ewallet-local-broker");
        broker.setPersistent(false);
        broker.setUseJmx(true);
        broker.setUseShutdownHook(false);
        broker.addConnector(BROKER_URL);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> stopQuietly(broker), "ewallet-local-broker-shutdown"));

        broker.start();
        broker.waitUntilStarted();

        System.out.println("Local ActiveMQ broker started on " + BROKER_URL);
        System.out.println("Keep this process running while user-service, wallet-service, and transaction-service are active.");

        new CountDownLatch(1).await();
    }

    private static void stopQuietly(BrokerService broker) {
        try {
            broker.stop();
            broker.waitUntilStopped();
        } catch (Exception ex) {
            System.err.println("Failed to stop local ActiveMQ broker cleanly: " + ex.getMessage());
        }
    }
}
