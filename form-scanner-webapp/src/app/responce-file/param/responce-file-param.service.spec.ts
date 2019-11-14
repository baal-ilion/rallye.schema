import { TestBed } from '@angular/core/testing';

import { ResponceFileParamService } from './responce-file-param.service';

describe('ResponceFileParamService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ResponceFileParamService = TestBed.get(ResponceFileParamService);
    expect(service).toBeTruthy();
  });
});
