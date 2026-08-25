import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsSubmittedFormComponent } from './details-submitted-form.component';

describe('DetailsSubmittedFormComponent', () => {
  let component: DetailsSubmittedFormComponent;
  let fixture: ComponentFixture<DetailsSubmittedFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsSubmittedFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsSubmittedFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
