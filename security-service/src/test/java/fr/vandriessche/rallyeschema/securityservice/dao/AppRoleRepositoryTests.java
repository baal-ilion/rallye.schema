package fr.vandriessche.rallyeschema.securityservice.dao;

import static org.junit.Assert.assertEquals;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.junit4.SpringRunner;

import fr.vandriessche.rallyeschema.securityservice.entities.AppRole;

@RunWith(SpringRunner.class)
@DataJpaTest
public class AppRoleRepositoryTests {

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private AppRoleRepository appRoleRepository;

	@Test
	public void whenFindByRoleName_thenReturnAppRole() {
		// given
		var role = new AppRole(null, "ROLE2");
		entityManager.persist(role);
		entityManager.flush();

		var roleToFound = role.toBuilder().build();
		// when
		var found = appRoleRepository.findByRoleName(roleToFound.getRoleName());

		// then
		assertEquals(roleToFound, found);
	}
}
