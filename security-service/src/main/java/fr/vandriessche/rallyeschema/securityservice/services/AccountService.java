package fr.vandriessche.rallyeschema.securityservice.services;

import javax.validation.constraints.NotBlank;

import fr.vandriessche.rallyeschema.securityservice.entities.AppRole;
import fr.vandriessche.rallyeschema.securityservice.entities.AppUser;

public interface AccountService {
	/**
	 * Enregistre un utilisateur avec son mot de passe.
	 * 
	 * @param userName          Nom de l'utilisateur
	 * @param password          Mot de passe
	 * @param confirmedPassword Confirmation du mot de passe
	 * @return L'utilisateur
	 */
	public AppUser saveUser(@NotBlank String userName, String password, String confirmedPassword);

	/**
	 * Inactive l'utilisateur s'il existe. Si l'utilisateur n'existe pas on ne fait
	 * rien.
	 * 
	 * @param userName Nom de l'utilisateur
	 */
	public void inactiveUser(@NotBlank String userName);

	/**
	 * Crée un nouveau role
	 * 
	 * @param role Le role à créer
	 * @return Le role créé
	 */
	public AppRole saveRole(AppRole role);

	/**
	 * Recherche un utilisateur par son nom
	 * 
	 * @param userName Nom de l'utilisateur
	 * @return L'utilisateur trouvé, sinon null
	 */
	public AppUser loadUser(@NotBlank String userName);

	/**
	 * Ajoute un role à l'utilisateur
	 * 
	 * @param userName Nom de l'utilisateur
	 * @param roleName Nom du role
	 */
	public void addRoleToUser(@NotBlank String userName, @NotBlank String roleName);

	/**
	 * Supprime un role à l'utilisateur
	 * 
	 * @param userName Nom de l'utilisateur
	 * @param roleName Nom du role
	 */
	public void removeRoleToUser(@NotBlank String userName, @NotBlank String roleName);
}
