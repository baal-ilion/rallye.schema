package fr.vandriessche.rallyeschema.securityservice.security;

import static org.hamcrest.CoreMatchers.is;
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
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
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

		String userString = "{\"userName\":\"" + username + "\",\"passWord\":\"" + password + "\"}";

		ResultActions result = mockMvc.perform(post("/login").contentType(CONTENT_TYPE).content(userString))
				.andExpect(status().isOk());

		String resultString = result.andReturn().getResponse().getHeader("Authorization");

		return resultString.substring(7);
	}

	@Test
	public void givenNoToken_whenGetSecureRequest_thenUnauthorized() throws Exception {
		mockMvc.perform(get("/appUsers")).andExpect(status().isForbidden()/* .isUnauthorized() */);
	}

	@Test
	public void givenInvalidRole_whenGetSecureRequest_thenForbidden() throws Exception {
		String accessToken = obtainAccessToken("user1", "1234");
		mockMvc.perform(get("/appUsers").header("Authorization", "Bearer " + accessToken))
				.andExpect(status().isForbidden());
	}

	@Test
	public void givenToken_whenPostGetSecureRequest_thenOk() throws Exception {
		String accessToken = obtainAccessToken("admin", "1234");

		String userString = "{\"userName\":\"user6\",\"password\":\"1234\",\"confirmedPassword\":\"1234\"}";

		mockMvc.perform(post("/register").header("Authorization", "Bearer " + accessToken).contentType(CONTENT_TYPE)
				.content(userString).accept(CONTENT_TYPE)).andExpect(status().isCreated());

		mockMvc.perform(get("/appUsers/search/findByUserName").param("userName", "user6")
				.header("Authorization", "Bearer " + accessToken).accept(CONTENT_TYPE)).andExpect(status().isOk())
				.andExpect(content().contentType(CONTENT_TYPE)).andExpect(jsonPath("$.userName", is("user6")));
	}
}
