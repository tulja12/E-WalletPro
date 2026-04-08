package com.ewallet.user.config;

import com.ewallet.user.entity.UserEntity;
import com.ewallet.user.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {

    private final UserService userService;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.email:admin@ewallet.local}")
    private String adminEmail;

    public AdminBootstrap(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void run(String... args) {
        if (userService.findByUsernameOptional(adminUsername).isPresent()) {
            userService.ensureRole(userService.findByUsername(adminUsername), "ADMIN");
            return;
        }

        UserEntity admin = new UserEntity();
        admin.setName("System Admin");
        admin.setUsername(adminUsername);
        admin.setEmail(adminEmail);
        admin.setPhone("0000000000");
        admin.setPasskey(adminPassword);

        UserEntity saved = userService.registerAdmin(admin);
        userService.ensureRole(saved, "ADMIN");
    }
}
