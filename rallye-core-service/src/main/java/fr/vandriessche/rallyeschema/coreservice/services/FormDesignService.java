package fr.vandriessche.rallyeschema.coreservice.services;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.coreservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.coreservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.coreservice.repositories.ChallengeConfigurationRepository;

@Service
public class FormDesignService {
	@Autowired
	private FormDesignRepository formDesignRepository;
	@Autowired
	private ChallengeConfigurationRepository challengeConfigurationRepository;

	public List<FormDesign> getChallengeFormDesigns() {
		return formDesignRepository.findAll().stream()
				.filter(FormDesign::isDesignerManaged)
				.filter(design -> design.getChallengeConfigurationId() != null)
				.collect(java.util.stream.Collectors.toList());
	}

	public FormDesign getChallengeFormDesign(String challengeConfigurationId) {
		challengeConfigurationRepository.findById(challengeConfigurationId).orElseThrow();
		return formDesignRepository.findByChallengeConfigurationId(challengeConfigurationId)
				.filter(FormDesign::isDesignerManaged).orElse(null);
	}

	public FormDesign saveChallengeFormDesign(String challengeConfigurationId, FormDesign design) {
		challengeConfigurationRepository.findById(challengeConfigurationId).orElseThrow();
		FormDesign existing = formDesignRepository.findByChallengeConfigurationId(challengeConfigurationId).orElse(null);
		design.setId(existing == null ? challengeConfigurationId : existing.getId());
		if (existing != null && design.getVersion() == null) {
			design.setVersion(existing.getVersion());
		}
		design.setChallengeConfigurationId(challengeConfigurationId);
		design.setDesignerManaged(true);
		design.setUpdatedAt(Instant.now());
		return formDesignRepository.save(design);
	}

	public void deleteChallengeFormDesign(String challengeConfigurationId) {
		formDesignRepository.findByChallengeConfigurationId(challengeConfigurationId)
				.filter(FormDesign::isDesignerManaged).ifPresent(formDesignRepository::delete);
	}

	public FormDesign getReferenceFormDesign() {
		return formDesignRepository.findById(FormDesign.REFERENCE_ID).filter(FormDesign::isDesignerManaged).orElse(null);
	}

	public FormDesign saveReferenceFormDesign(FormDesign design) {
		FormDesign existing = formDesignRepository.findById(FormDesign.REFERENCE_ID).orElse(null);
		design.setId(FormDesign.REFERENCE_ID);
		if (existing != null && design.getVersion() == null) {
			design.setVersion(existing.getVersion());
		}
		design.setChallengeConfigurationId(null);
		design.setDesignerManaged(true);
		design.setUpdatedAt(Instant.now());
		return formDesignRepository.save(design);
	}

	public void deleteReferenceFormDesign() {
		formDesignRepository.findById(FormDesign.REFERENCE_ID).filter(FormDesign::isDesignerManaged)
				.ifPresent(formDesignRepository::delete);
	}
}
