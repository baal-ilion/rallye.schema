import { TestBed } from '@angular/core/testing';

import { ChallengeConfigurationService } from './challenge-configuration.service';

describe('ChallengeConfigurationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ChallengeConfigurationService = TestBed.get(ChallengeConfigurationService);
    expect(service).toBeTruthy();
  });
});
