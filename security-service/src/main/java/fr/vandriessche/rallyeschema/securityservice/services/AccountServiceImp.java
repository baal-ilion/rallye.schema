package fr.vandriessche.rallyeschema.securityservice.services;

import javax.validation.constraints.NotBlank;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.vandriessche.rallyeschema.securityservice.dao.AppRoleRepository;
import fr.vandriessche.rallyeschema.securityservice.dao.AppUserRepository;
import fr.vandriessche.rallyeschema.securityservice.entities.AppRole;
import fr.vandriessche.rallyeschema.securityservice.entities.AppUser;
import fr.vandriessche.rallyeschema.securityservice.util.SystemAppRole;

@Service
@Transactional
public class AccountServiceImp implements AccountService {
	@Autowired
	private AppRoleRepository appRoleRepository;
	@Autowired
	private AppUserRepository appUserRepository;
	@Autowired
	private BCryptPasswordEncoder bCryptPasswordEncoder;

	@Override
	public AppUser saveUser(@NotBlank String userName, String password, String confirmedPassword) {
		AppUser user = appUserRepository.findByUserName(userName);
		if (user != null)
			throw new RuntimeException("User already exists");
		if (!password.equals(confirmedPassword))
			throw new RuntimeException("Please confirm your password");
		user = new AppUser();
		user.setUserName(userName);
		user.setPassWord(bCryptPasswordEncoder.encode(password));
		user.setActivated(true);

		AppRole role = appRoleRepository.findByRoleName(SystemAppRole.USER.name());
		if (role != null)
			user.getAppRoles().add(role);
		return appUserRepository.save(user);
	}

	@Override
	public void inactiveUser(@NotBlank String userName) {
		AppUser user = appUserRepository.findByUserName(userName);
		if (user != null) {
			user.setActivated(false);
			appUserRepository.save(user);
		}
	}

	@Override
	public AppRole saveRole(AppRole role) {
		return appRoleRepository.save(role);
	}

	@Override
	public AppUser loadUser(@NotBlank String userName) {
		return appUserRepository.findByUserName(userName);
	}

	@Override
	public void addRoleToUser(@NotBlank String userName, @NotBlank String roleName) {
		AppRole role = appRoleRepository.findByRoleName(roleName);
		if (role != null) {
			AppUser user = appUserRepository.findByUserName(userName);
			if ((user != null) && !user.getAppRoles().contains(role)) {
				user.getAppRoles().add(role);
				appUserRepository.save(user);
			}
		}
	}

	@Override
	public void removeRoleToUser(@NotBlank String userName, @NotBlank String roleName) {
		AppRole role = appRoleRepository.findByRoleName(roleName);
		if (role != null) {
			AppUser user = appUserRepository.findByUserName(userName);
			if ((user != null) && user.getAppRoles().contains(role)) {
				user.getAppRoles().remove(role);
				appUserRepository.save(user);
			}
		}
	}

}
