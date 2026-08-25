import { TestBed } from '@angular/core/testing';

import { ChallengeService } from './challenge.service';

describe('ChallengeService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ChallengeService = TestBed.get(ChallengeService);
    expect(service).toBeTruthy();
  });
});
