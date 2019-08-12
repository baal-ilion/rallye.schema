package fr.vandriessche.rallyeschema.securityservice.security;

public class SecurityParams {
	private SecurityParams() {
		throw new IllegalStateException("Utility class");
	}

	public static final String PRIVATE_SECRET = "cle secrette";
	public static final String JWT_HEADER = "Authorization";
	public static final String TOKEN_PREFIX = "Bearer ";
	public static final long TOKEN_EXPIRATION = 10L * 24L * 3600L;
}
