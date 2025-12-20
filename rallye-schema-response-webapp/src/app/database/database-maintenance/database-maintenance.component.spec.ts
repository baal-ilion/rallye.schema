import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { DatabaseMaintenanceComponent } from './database-maintenance.component';

describe('DatabaseMaintenanceComponent', () => {
  let component: DatabaseMaintenanceComponent;
  let fixture: ComponentFixture<DatabaseMaintenanceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DatabaseMaintenanceComponent ],
      imports: [ HttpClientTestingModule ],
      providers: [
        { provide: ConfirmationDialogService, useValue: { confirm: () => Promise.resolve(false) } }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DatabaseMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
