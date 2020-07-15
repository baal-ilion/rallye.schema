import { TestBed } from '@angular/core/testing';

import { LogFileService } from './log-file.service';

describe('LogFileService', () => {
  let service: LogFileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LogFileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
