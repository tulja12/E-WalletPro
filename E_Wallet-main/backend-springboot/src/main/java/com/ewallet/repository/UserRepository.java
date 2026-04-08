
package com.ewallet.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.ewallet.model.User;

public interface UserRepository extends JpaRepository<User,Long>{
    public User findByUsername(String username);
}
