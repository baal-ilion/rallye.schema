package fr.vandriessche.rallyeschema.formscannerservice.dto;

import org.springframework.web.multipart.MultipartFile;

import fr.vandriessche.rallyeschema.formscannerservice.entities.ResponceFileParam;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class ResponceFileParamDto extends ResponceFileParam {
	MultipartFile templateFile;
}
