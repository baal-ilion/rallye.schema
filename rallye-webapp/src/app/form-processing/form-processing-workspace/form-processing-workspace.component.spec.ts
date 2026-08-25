import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormProcessingWorkspaceComponent } from './form-processing-workspace.component';

describe('FormProcessingWorkspaceComponent', () => {
  let component: FormProcessingWorkspaceComponent;
  let fixture: ComponentFixture<FormProcessingWorkspaceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormProcessingWorkspaceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormProcessingWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
