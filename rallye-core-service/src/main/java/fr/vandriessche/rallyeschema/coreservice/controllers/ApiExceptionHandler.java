package fr.vandriessche.rallyeschema.coreservice.controllers;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(OptimisticLockingFailureException.class)
	@ResponseStatus(HttpStatus.CONFLICT)
	public Map<String, Object> optimisticLockingConflict(OptimisticLockingFailureException exception) {
		Map<String, Object> error = new LinkedHashMap<>();
		error.put("status", HttpStatus.CONFLICT.value());
		error.put("error", "Configuration modifiée simultanément");
		error.put("message", "Rechargez la configuration avant de recommencer l'enregistrement.");
		return error;
	}
}
