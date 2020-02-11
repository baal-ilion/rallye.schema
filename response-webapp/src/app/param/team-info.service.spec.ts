import { TestBed } from '@angular/core/testing';

import { TeamInfoService } from './team-info.service';

describe('TeamInfoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TeamInfoService = TestBed.get(TeamInfoService);
    expect(service).toBeTruthy();
  });
});
