import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormTemplatePreviewComponent } from './form-template-preview.component';

describe('FormTemplatePreviewComponent', () => {
  let component: FormTemplatePreviewComponent;
  let fixture: ComponentFixture<FormTemplatePreviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormTemplatePreviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormTemplatePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
