import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DatabaseMaintenanceService } from './database-maintenance.service';

describe('DatabaseMaintenanceService', () => {
  let service: DatabaseMaintenanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(DatabaseMaintenanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
