package fr.vandriessche.rallyeschema.responseservice.services;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.responseservice.entities.FormDesign;
import fr.vandriessche.rallyeschema.responseservice.repositories.FormDesignRepository;
import fr.vandriessche.rallyeschema.responseservice.repositories.StageParamRepository;

@Service
public class FormDesignService {
	@Autowired
	private FormDesignRepository formDesignRepository;
	@Autowired
	private StageParamRepository stageParamRepository;

	public List<FormDesign> getStageFormDesigns() {
		return formDesignRepository.findAll().stream()
				.filter(design -> design.getStageParamId() != null)
				.collect(java.util.stream.Collectors.toList());
	}

	public FormDesign getStageFormDesign(String stageParamId) {
		stageParamRepository.findById(stageParamId).orElseThrow();
		return formDesignRepository.findByStageParamId(stageParamId).orElse(null);
	}

	public FormDesign saveStageFormDesign(String stageParamId, FormDesign design) {
		stageParamRepository.findById(stageParamId).orElseThrow();
		FormDesign existing = formDesignRepository.findByStageParamId(stageParamId).orElse(null);
		design.setId(existing == null ? stageParamId : existing.getId());
		if (existing != null && design.getVersion() == null) {
			design.setVersion(existing.getVersion());
		}
		design.setStageParamId(stageParamId);
		design.setUpdatedAt(Instant.now());
		return formDesignRepository.save(design);
	}

	public void deleteStageFormDesign(String stageParamId) {
		formDesignRepository.deleteByStageParamId(stageParamId);
	}

	public FormDesign getReferenceFormDesign() {
		return formDesignRepository.findById(FormDesign.REFERENCE_ID).orElse(null);
	}

	public FormDesign saveReferenceFormDesign(FormDesign design) {
		FormDesign existing = formDesignRepository.findById(FormDesign.REFERENCE_ID).orElse(null);
		design.setId(FormDesign.REFERENCE_ID);
		if (existing != null && design.getVersion() == null) {
			design.setVersion(existing.getVersion());
		}
		design.setStageParamId(null);
		design.setUpdatedAt(Instant.now());
		return formDesignRepository.save(design);
	}

	public void deleteReferenceFormDesign() {
		formDesignRepository.deleteById(FormDesign.REFERENCE_ID);
	}
}
