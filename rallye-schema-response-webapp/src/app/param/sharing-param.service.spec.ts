import { TestBed } from '@angular/core/testing';

import { SharingParamService } from './sharing-param.service';

describe('SharingParamService', () => {
  let service: SharingParamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SharingParamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
