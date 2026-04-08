package com.ewallet.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class TransactionHistoryItemDto {

    private Long id;
    private Long senderId;
    private Long receiverId;
    private BigDecimal amount;
    private String type;
    private String status;
    private LocalDateTime dateTime;
    private String typeLabel;
    private String summary;
    private String description;
    private String fromLabel;
    private String toLabel;
    private String impactType;
    private String impactLabel;
    private String detailLine;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }

    public String getTypeLabel() {
        return typeLabel;
    }

    public void setTypeLabel(String typeLabel) {
        this.typeLabel = typeLabel;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getFromLabel() {
        return fromLabel;
    }

    public void setFromLabel(String fromLabel) {
        this.fromLabel = fromLabel;
    }

    public String getToLabel() {
        return toLabel;
    }

    public void setToLabel(String toLabel) {
        this.toLabel = toLabel;
    }

    public String getImpactType() {
        return impactType;
    }

    public void setImpactType(String impactType) {
        this.impactType = impactType;
    }

    public String getImpactLabel() {
        return impactLabel;
    }

    public void setImpactLabel(String impactLabel) {
        this.impactLabel = impactLabel;
    }

    public String getDetailLine() {
        return detailLine;
    }

    public void setDetailLine(String detailLine) {
        this.detailLine = detailLine;
    }
}
