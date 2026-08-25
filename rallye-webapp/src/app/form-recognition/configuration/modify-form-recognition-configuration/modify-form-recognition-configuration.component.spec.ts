import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyFormRecognitionConfigurationComponent } from './modify-form-recognition-configuration.component';

describe('ModifyFormRecognitionConfigurationComponent', () => {
  let component: ModifyFormRecognitionConfigurationComponent;
  let fixture: ComponentFixture<ModifyFormRecognitionConfigurationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyFormRecognitionConfigurationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyFormRecognitionConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
