import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmittedFormActionsComponent } from './submitted-form-actions.component';

describe('SubmittedFormActionsComponent', () => {
  let component: SubmittedFormActionsComponent;
  let fixture: ComponentFixture<SubmittedFormActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SubmittedFormActionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubmittedFormActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
