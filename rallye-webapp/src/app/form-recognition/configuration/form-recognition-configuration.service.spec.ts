import { TestBed } from '@angular/core/testing';

import { FormRecognitionConfigurationService } from './form-recognition-configuration.service';

describe('FormRecognitionConfigurationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FormRecognitionConfigurationService = TestBed.get(FormRecognitionConfigurationService);
    expect(service).toBeTruthy();
  });
});
