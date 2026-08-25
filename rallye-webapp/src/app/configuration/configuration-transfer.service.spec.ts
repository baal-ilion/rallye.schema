import { TestBed } from '@angular/core/testing';

import { ConfigurationTransferService } from './configuration-transfer.service';

describe('ConfigurationTransferService', () => {
  let service: ConfigurationTransferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigurationTransferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
