package com.ewallet.service;

import com.ewallet.model.User;
import com.ewallet.model.UserRole;
import com.ewallet.repository.UserRepository;
import com.ewallet.repository.UserRoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    UserRepository userRepository;

    @Autowired
    UserRoleRepository userRoleRepository;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new UsernameNotFoundException("User not found");
        }

        UserRole userRole = userRoleRepository.findByUserId(user.getId()).orElse(null);
        String roleType = userRole != null ? userRole.getRoleType() : "USER";

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasskey(),
                !user.isBlocked(),
                true,
                true,
                !user.isBlocked(),
                List.of(new SimpleGrantedAuthority("ROLE_" + roleType))
        );

    }

}
