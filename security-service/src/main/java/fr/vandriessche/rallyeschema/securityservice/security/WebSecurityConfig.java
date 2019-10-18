package fr.vandriessche.rallyeschema.securityservice.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
@Order(1)
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {
	private UserDetailsServiceImpl userDetailsService;
	private PasswordEncoder passwordEncoder;

	@Override
	public void configure(WebSecurity web) throws Exception {
		web.ignoring().antMatchers("/v2/api-docs", "/configuration/ui", "/swagger-resources/**",
				"/configuration/security", "/swagger-ui.html", "/webjars/**");
	}

	@Override
	protected void configure(HttpSecurity http) throws Exception {
		http.authorizeRequests().antMatchers("/login").permitAll().antMatchers("/oauth/token/revokeById/**").permitAll()
				.antMatchers("/tokens/**").permitAll().anyRequest().authenticated().and().formLogin().permitAll().and()
				.csrf().disable();
		// ResourceServerConfiguration.ConfigureHttpSecurity(http);
	}

	@Override
	protected void configure(AuthenticationManagerBuilder auth) throws Exception {
		auth.userDetailsService(userDetailsService).passwordEncoder(passwordEncoder());
	}

	@Bean
	@Override
	public AuthenticationManager authenticationManagerBean() throws Exception {
		return super.authenticationManagerBean();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		if (passwordEncoder == null) {
			passwordEncoder = DefaultPasswordEncoderFactories.createDelegatingPasswordEncoder();
		}
		return passwordEncoder;
	}

	@Bean
	@Override
	public UserDetailsService userDetailsService() {
		if (userDetailsService == null) {
			userDetailsService = new UserDetailsServiceImpl();
		}
		return userDetailsService;
	}

}
