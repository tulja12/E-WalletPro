package com.ewallet.wallet.repository;

import com.ewallet.wallet.entity.BankAccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BankAccountRepository extends JpaRepository<BankAccountEntity, Long> {

    List<BankAccountEntity> findByUserId(Long userId);
}
