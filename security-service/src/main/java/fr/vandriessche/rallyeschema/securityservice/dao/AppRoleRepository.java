package fr.vandriessche.rallyeschema.securityservice.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.rest.core.annotation.RestResource;

import fr.vandriessche.rallyeschema.securityservice.entities.AppRole;

@RepositoryRestResource
public interface AppRoleRepository extends JpaRepository<AppRole, Long> {
	public AppRole findByRoleName(String roleName);

	@Override
	@RestResource(exported = false)
	public void delete(AppRole entity);

	@Override
	@RestResource(exported = false)
	public void deleteById(Long id);
}
