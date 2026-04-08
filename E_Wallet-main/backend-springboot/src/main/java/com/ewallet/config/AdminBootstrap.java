package com.ewallet.config;

import com.ewallet.model.User;
import com.ewallet.model.UserRole;
import com.ewallet.repository.UserRepository;
import com.ewallet.repository.UserRoleRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.email:admin@ewallet.local}")
    private String adminEmail;

    public AdminBootstrap(UserRepository userRepository,
                          UserRoleRepository userRoleRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        User adminUser = userRepository.findByUsername(adminUsername);

        if (adminUser == null) {
            adminUser = new User();
            adminUser.setName("System Admin");
            adminUser.setEmail(adminEmail);
            adminUser.setPhone("0000000000");
            adminUser.setUsername(adminUsername);
            adminUser.setPasskey(passwordEncoder.encode(adminPassword));
            adminUser.setBalance(0.0);
            adminUser = userRepository.save(adminUser);
        }

        ensureRole(adminUser, "ADMIN");

        for (User user : userRepository.findAll()) {
            if (!user.getId().equals(adminUser.getId())) {
                ensureRoleIfMissing(user, "USER");
            }
        }
    }

    private void ensureRole(User user, String roleType) {
        UserRole userRole = userRoleRepository.findByUserId(user.getId()).orElse(null);
        if (userRole == null) {
            userRole = new UserRole();
            userRole.setUserId(user.getId());
        }
        userRole.setRoleType(roleType);
        userRoleRepository.save(userRole);
    }

    private void ensureRoleIfMissing(User user, String roleType) {
        if (userRoleRepository.findByUserId(user.getId()).isEmpty()) {
            ensureRole(user, roleType);
        }
    }
}
