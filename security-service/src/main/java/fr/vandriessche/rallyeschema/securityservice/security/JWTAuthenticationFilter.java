package fr.vandriessche.rallyeschema.securityservice.security;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.fasterxml.jackson.databind.ObjectMapper;

import fr.vandriessche.rallyeschema.securityservice.entities.AppUser;

public class JWTAuthenticationFilter extends UsernamePasswordAuthenticationFilter {
	private AuthenticationManager authenticationManager;

	public JWTAuthenticationFilter(AuthenticationManager authenticationManager) {
		this.authenticationManager = authenticationManager;
	}

	@Override
	public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response)
			throws AuthenticationException {
		try {
			AppUser appUser = new ObjectMapper().readValue(request.getInputStream(), AppUser.class);
			return authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(appUser.getUserName(), appUser.getPassWord()));
		} catch (IOException e) {
			e.printStackTrace();
			throw new RuntimeException(e);
		}
	}

	@Override
	protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain,
			Authentication authResult) throws IOException, ServletException {
		User springUser = (User) authResult.getPrincipal();
		List<String> roles = new ArrayList<>();
		springUser.getAuthorities().forEach(a -> roles.add(a.getAuthority()));
		String jwt = JWT.create().withIssuer(request.getRequestURI()).withSubject(springUser.getUsername())
				.withArrayClaim("roles", roles.toArray(new String[roles.size()]))
				.withExpiresAt(new Date(System.currentTimeMillis() + SecurityParams.TOKEN_EXPIRATION))
				.sign(Algorithm.HMAC256(SecurityParams.PRIVATE_SECRET));
		response.addHeader(SecurityParams.JWT_HEADER, SecurityParams.TOKEN_PREFIX + jwt);
	}
}