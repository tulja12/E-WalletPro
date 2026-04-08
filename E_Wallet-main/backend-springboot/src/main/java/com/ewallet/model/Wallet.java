package com.ewallet.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Double balance;

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Double getBalance() { return balance; }

    public void setUserId(Long userId) { this.userId = userId; }
    public void setBalance(Double balance) { this.balance = balance; }
}