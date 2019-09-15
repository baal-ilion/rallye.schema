package fr.vandriessche.rallyeschema.securityservice;

import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import fr.vandriessche.rallyeschema.securityservice.entities.AppRole;
import fr.vandriessche.rallyeschema.securityservice.services.AccountService;

@Component
public class SecurityServiceRunner implements CommandLineRunner {

	@Autowired
	AccountService accountService;
	
	@Override
	public void run(String... args) throws Exception {
		accountService.saveRole(new AppRole(null, "USER"));
		accountService.saveRole(new AppRole(null, "ADMIN"));
		Stream.of("user1", "user2", "user3", "admin")
				.forEach(userName -> accountService.saveUser(userName, "1234", "1234"));
		accountService.addRoleToUser("admin", "ADMIN");
	}

}
