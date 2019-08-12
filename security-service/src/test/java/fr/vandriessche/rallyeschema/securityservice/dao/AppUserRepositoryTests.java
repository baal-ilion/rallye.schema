package fr.vandriessche.rallyeschema.securityservice.dao;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.junit4.SpringRunner;

import fr.vandriessche.rallyeschema.securityservice.entities.AppRole;
import fr.vandriessche.rallyeschema.securityservice.entities.AppUser;

@RunWith(SpringRunner.class)
//@ExtendWith(SpringExtension.class)
@DataJpaTest
public class AppUserRepositoryTests {

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private AppUserRepository appUserRepository;

	@Test
	public void whenFindByUserName_thenReturnAppUser() {
		// given
		var role = new AppRole(null, "ROLE1");
		entityManager.persist(role);
		entityManager.flush();
		var user = new AppUser(null, "User1", "Pass1", true, new ArrayList<AppRole>());
		user.getAppRoles().add(role.toBuilder().build());
		entityManager.persist(user);
		entityManager.flush();

		var userToFound = user.toBuilder().build();

		// when
		var found = appUserRepository.findByUserName(userToFound.getUserName());

		// then
		assertEquals(userToFound, found);
	}
}
