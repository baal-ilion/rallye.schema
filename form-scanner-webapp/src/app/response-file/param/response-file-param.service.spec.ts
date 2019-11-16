import { TestBed } from '@angular/core/testing';

import { ResponseFileParamService } from './response-file-param.service';

describe('ResponseFileParamService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ResponseFileParamService = TestBed.get(ResponseFileParamService);
    expect(service).toBeTruthy();
  });
});
