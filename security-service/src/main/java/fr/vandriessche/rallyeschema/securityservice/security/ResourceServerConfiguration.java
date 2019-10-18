package fr.vandriessche.rallyeschema.securityservice.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.config.annotation.web.configuration.EnableResourceServer;
import org.springframework.security.oauth2.config.annotation.web.configuration.ResourceServerConfigurerAdapter;
import org.springframework.security.oauth2.provider.token.TokenStore;

@EnableResourceServer
@Configuration
//@Profile("mvc")
public class ResourceServerConfiguration extends ResourceServerConfigurerAdapter {

	private static final String USERS_PATTERN = "/appUsers/**";
	private static final String ROLES_PATTERN = "/appRoles/**";
	private static final String REGISTER_PATTERN = "/register/**";

	private final TokenStore tokenStore;

	public ResourceServerConfiguration(final TokenStore tokenStore) {
		super();
		this.tokenStore = tokenStore;
	}

	@Override
	public void configure(HttpSecurity http) throws Exception {
		http.authorizeRequests().antMatchers(USERS_PATTERN, ROLES_PATTERN).hasRole("ADMIN");
		// ConfigureHttpSecurity(http);
	}

	public static void ConfigureHttpSecurity(HttpSecurity http) throws Exception {

		http.authorizeRequests().antMatchers(REGISTER_PATTERN).permitAll().antMatchers("/login").permitAll()
				.antMatchers("/oauth/token/revokeById/**").permitAll().antMatchers("/tokens/**").permitAll()
				.antMatchers(USERS_PATTERN, ROLES_PATTERN).hasRole("ADMIN").anyRequest().authenticated().and()
				.formLogin().permitAll().and().csrf().disable();

		/*
		 * http.authorizeRequests().antMatchers(HttpMethod.GET, USERS_PATTERN,
		 * ROLES_PATTERN)
		 * .access("#oauth2.hasScope('read')").antMatchers(HttpMethod.POST,
		 * USERS_PATTERN, ROLES_PATTERN)
		 * .access("#oauth2.hasScope('write')").antMatchers(HttpMethod.PATCH,
		 * USERS_PATTERN, ROLES_PATTERN)
		 * .access("#oauth2.hasScope('write')").antMatchers(HttpMethod.PUT,
		 * USERS_PATTERN, ROLES_PATTERN)
		 * .access("#oauth2.hasScope('write')").antMatchers(HttpMethod.DELETE,
		 * USERS_PATTERN, ROLES_PATTERN) .access("#oauth2.hasScope('write')");//
		 * .antMatchers(REGISTER_PATTERN).access("#oauth2.hasScope('write')");
		 */
	}

	/*
	 * @Override public void configure(final ResourceServerSecurityConfigurer
	 * resources) { resources.tokenStore(tokenStore); }
	 */

}