import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormIdentificationEditorComponent } from './form-identification-editor.component';

describe('FormIdentificationEditorComponent', () => {
  let component: FormIdentificationEditorComponent;
  let fixture: ComponentFixture<FormIdentificationEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormIdentificationEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormIdentificationEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
