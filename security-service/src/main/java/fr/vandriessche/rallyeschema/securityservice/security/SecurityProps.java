package fr.vandriessche.rallyeschema.securityservice.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.io.Resource;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@ConfigurationProperties("security")
public class SecurityProps {

	private JwtProps jwt;

	@Getter
	@Setter
	public static class JwtProps {

		private Resource keyStore;
		private String keyStorePassword;
		private String keyPairAlias;
		private String keyPairPassword;
	}
}
