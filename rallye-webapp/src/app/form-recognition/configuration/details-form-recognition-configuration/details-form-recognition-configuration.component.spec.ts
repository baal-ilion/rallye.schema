import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsFormRecognitionConfigurationComponent } from './details-form-recognition-configuration.component';

describe('DetailsFormRecognitionConfigurationComponent', () => {
  let component: DetailsFormRecognitionConfigurationComponent;
  let fixture: ComponentFixture<DetailsFormRecognitionConfigurationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsFormRecognitionConfigurationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsFormRecognitionConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
