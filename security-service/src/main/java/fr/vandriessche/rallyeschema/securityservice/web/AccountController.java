package fr.vandriessche.rallyeschema.securityservice.web;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.rest.webmvc.PersistentEntityResource;
import org.springframework.data.rest.webmvc.PersistentEntityResourceAssembler;
import org.springframework.data.rest.webmvc.RepositoryRestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import fr.vandriessche.rallyeschema.securityservice.services.AccountService;
import lombok.Data;

@RepositoryRestController
@RequestMapping("/")
public class AccountController {
	@Autowired
	private AccountService accountService;

	@PostMapping("/register")
	public @ResponseBody ResponseEntity<PersistentEntityResource> register(@RequestBody UserForm user,
			PersistentEntityResourceAssembler resourceAssembler) {
		var appUser = accountService.saveUser(user.getUserName(), user.getPassword(), user.getConfirmedPassword());
		return ResponseEntity.status(HttpStatus.CREATED).body(resourceAssembler.toResource(appUser));
	}
}

@Data
class UserForm {
	private String userName;
	private String password;
	private String confirmedPassword;
}