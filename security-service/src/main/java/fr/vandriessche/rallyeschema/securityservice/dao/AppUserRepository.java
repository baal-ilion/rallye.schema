package fr.vandriessche.rallyeschema.securityservice.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import fr.vandriessche.rallyeschema.securityservice.entities.AppUser;

@RepositoryRestResource
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
	public AppUser findByUserName(String userName);
}
