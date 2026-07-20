package fr.vandriessche.rallyeschema.responseservice.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.responseservice.entities.RallyParam;
import fr.vandriessche.rallyeschema.responseservice.repositories.RallyParamRepository;

@Service
public class RallyParamService {
	@Autowired
	private RallyParamRepository rallyParamRepository;

	public RallyParam getRallyParam() {
		return rallyParamRepository.findById(RallyParam.SINGLETON_ID)
				.orElseGet(() -> rallyParamRepository.save(new RallyParam()));
	}

	public RallyParam saveRallyParam(RallyParam rallyParam) {
		rallyParam.setId(RallyParam.SINGLETON_ID);
		return rallyParamRepository.save(rallyParam);
	}
}
