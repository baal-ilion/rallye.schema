package fr.vandriessche.rallyeschema.securityservice.security;

import static org.hamcrest.CoreMatchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.common.util.JacksonJsonParser;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.context.WebApplicationContext;

@RunWith(SpringRunner.class)
@WebAppConfiguration
@SpringBootTest
public class AuthenticationTests {
	@Autowired
	private WebApplicationContext wac;

	@Autowired
	private FilterChainProxy springSecurityFilterChain;

	private MockMvc mockMvc;

	private static final String CONTENT_TYPE = "application/json;charset=UTF-8";

	@Before
	public void setup() {
		mockMvc = MockMvcBuilders.webAppContextSetup(this.wac).addFilter(springSecurityFilterChain).build();
	}

	private String obtainAccessToken(String username, String password) throws Exception {
		MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
		params.add("grant_type", "password");
		params.add("username", username);
		params.add("password", password);

		ResultActions result = mockMvc
				.perform(post("/oauth/token").params(params).with(httpBasic("webapp", "123456"))
						.accept("application/json;charset=UTF-8"))
				.andExpect(status().isOk()).andExpect(content().contentType("application/json;charset=UTF-8"));

		String resultString = result.andReturn().getResponse().getContentAsString();

		JacksonJsonParser jsonParser = new JacksonJsonParser();
		return jsonParser.parseMap(resultString).get("access_token").toString();
	}

	@Test
	public void givenNoToken_whenGetSecureRequest_thenUnauthorized() throws Exception {
		mockMvc.perform(get("/appUsers")).andExpect(status().isUnauthorized());
	}

	@Test
	public void givenInvalidRole_whenGetSecureRequest_thenForbidden() throws Exception {
		String accessToken = obtainAccessToken("user1", "1234");
		mockMvc.perform(get("/appUsers").header("Authorization", "Bearer " + accessToken))
				.andExpect(status().isForbidden());
	}

	@Test
	public void givenValidRole_whenGetSecureRequest_thenOk() throws Exception {
		String accessToken = obtainAccessToken("admin", "1234");
		mockMvc.perform(get("/appUsers").header("Authorization", "Bearer " + accessToken)).andExpect(status().isOk());
	}

	@Test
	public void givenToken_whenPostGetSecureRequest_thenOk() throws Exception {

		String userString = "{\"userName\":\"user6\",\"password\":\"1234\",\"confirmedPassword\":\"1234\"}";

		mockMvc.perform(
				post("/register")/* .header("Authorization", "Bearer " + accessToken) */.contentType(CONTENT_TYPE)
						.content(userString).accept(CONTENT_TYPE))
				.andExpect(status().isCreated());

		String accessToken = obtainAccessToken("admin", "1234");

		mockMvc.perform(get("/appUsers/search/findByUserName").param("userName", "user6")
				.header("Authorization", "Bearer " + accessToken).accept(CONTENT_TYPE)).andExpect(status().isOk())
				.andExpect(content().contentType(CONTENT_TYPE)).andExpect(jsonPath("$.userName", is("user6")));
	}

	@Test
	public void implicit_request() throws Exception {
		/*
		 * "http://localhost:8080/oauth/authorize?response_type=token" +
		 * "&client_id=webapp" + "&state=el7WXM8S8wskCE3AL24HGxfEA3r7tj26GOSECZ3tIUxMc"
		 * + "&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2F" + "&scope=read%20write"
		 */
		{
			MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
			params.add("response_type", "token");
			params.add("client_id", "webapp");
			params.add("state", "el7WXM8S8wskCE3AL24HGxfEA3r7tj26GOSECZ3tIUxMc");
			params.add("redirect_uri", "http://localhost:4200/");
			params.add("scope", "read write");

			ResultActions result = mockMvc
					.perform(post("/oauth/authorize").params(params)/* .header("Referer", "http://localhost:4200/") */)
					.andExpect(status().isFound());

			MockHttpServletResponse rep = result.andReturn().getResponse();
			String resultString = result.andReturn().getResponse().getContentAsString();
			String redirectedUrl = result.andReturn().getResponse().getRedirectedUrl();
		}
		{
			MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
			params.add("username", "admin");
			params.add("password", "1234");

			ResultActions result = mockMvc.perform(post("/login").params(params)).andExpect(status().isFound());

			MockHttpServletResponse rep = result.andReturn().getResponse();
			String resultString = result.andReturn().getResponse().getContentAsString();
			String redirectedUrl = result.andReturn().getResponse().getRedirectedUrl();
		} /*
			 * JacksonJsonParser jsonParser = new JacksonJsonParser(); return
			 * jsonParser.parseMap(resultString).get("access_token").toString();
			 */
	}
}
