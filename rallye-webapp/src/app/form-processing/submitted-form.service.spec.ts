import { TestBed } from '@angular/core/testing';

import { SubmittedFormService } from './submitted-form.service';

describe('SubmittedFormService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SubmittedFormService = TestBed.get(SubmittedFormService);
    expect(service).toBeTruthy();
  });
});
