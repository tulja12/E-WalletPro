package com.ewallet.transaction.repository;

import com.ewallet.transaction.entity.TransactionRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<TransactionRecord, Long> {

    boolean existsByReferenceId(String referenceId);

    Optional<TransactionRecord> findByReferenceId(String referenceId);

    List<TransactionRecord> findBySenderIdOrReceiverIdOrderByOccurredAtDesc(Long senderId, Long receiverId);
}
