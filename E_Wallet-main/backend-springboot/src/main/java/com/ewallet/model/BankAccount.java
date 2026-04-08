package com.ewallet.model;

import jakarta.persistence.*;

@Entity
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bankName;
    private String cardNumber;
    private String accountHolder;
    private Double balance;

    private Long userId; // OK for now

    // ✅ GETTERS

    public Long getId() {
        return id;
    }

    public String getBankName() {
        return bankName;
    }

    public String getCardNumber() {
        return cardNumber;
    }

    public String getAccountHolder() {
        return accountHolder;
    }

    public Double getBalance() {
        return balance;
    }

    public Long getUserId() {
        return userId;
    }

    // ✅ SETTERS

    public void setId(Long id) {
        this.id = id;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;   // 🔥 FIX
    }

    public void setCardNumber(String cardNumber) {
        this.cardNumber = cardNumber; // 🔥 FIX
    }

    public void setAccountHolder(String accountHolder) {
        this.accountHolder = accountHolder; // 🔥 FIX
    }

    public void setBalance(Double balance) {
        this.balance = balance; // 🔥 FIX
    }

    public void setUserId(Long userId) {
        this.userId = userId; // 🔥 FIX
    }
}