import { TestBed } from '@angular/core/testing';

import { StageParamService } from './stage-param.service';

describe('StageParamService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: StageParamService = TestBed.get(StageParamService);
    expect(service).toBeTruthy();
  });
});
