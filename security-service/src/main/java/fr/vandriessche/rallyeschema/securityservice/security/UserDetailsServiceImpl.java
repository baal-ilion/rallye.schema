package fr.vandriessche.rallyeschema.securityservice.security;

import java.util.ArrayList;
import java.util.Collection;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.securityservice.entities.AppUser;
import fr.vandriessche.rallyeschema.securityservice.services.AccountService;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
	@Autowired
	private AccountService accountService;

	@Override
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		AppUser user = accountService.loadUser(username);
		if (user == null)
			throw new UsernameNotFoundException("invalid user");
		Collection<GrantedAuthority> authorities = new ArrayList<>();
		user.getAppRoles().forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r.getRoleName())));
		return new User(user.getUserName(), user.getPassWord(), authorities);
	}
}