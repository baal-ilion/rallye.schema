import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormVerificationComponent } from './form-verification.component';

describe('FormVerificationComponent', () => {
  let component: FormVerificationComponent;
  let fixture: ComponentFixture<FormVerificationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormVerificationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
