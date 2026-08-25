import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamQrCodeComponent } from './team-qr-code.component';

describe('TeamQrCodeComponent', () => {
  let component: TeamQrCodeComponent;
  let fixture: ComponentFixture<TeamQrCodeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TeamQrCodeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamQrCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
