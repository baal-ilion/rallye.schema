package fr.vandriessche.rallyeschema.securityservice;

import java.util.stream.Stream;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import fr.vandriessche.rallyeschema.securityservice.entities.AppRole;
import fr.vandriessche.rallyeschema.securityservice.services.AccountService;

@SpringBootApplication
public class SecurityServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(SecurityServiceApplication.class, args);
	}

	@Bean
	CommandLineRunner start(AccountService accountService) {
		return args -> {
			accountService.saveRole(new AppRole(null, "USER"));
			accountService.saveRole(new AppRole(null, "ADMIN"));
			Stream.of("user1", "user2", "user3", "admin")
					.forEach(userName -> accountService.saveUser(userName, "1234", "1234"));
			accountService.addRoleToUser("admin", "ADMIN");
		};
	}

	@Bean
	BCryptPasswordEncoder getBCPE() {
		return new BCryptPasswordEncoder();
	}

}
