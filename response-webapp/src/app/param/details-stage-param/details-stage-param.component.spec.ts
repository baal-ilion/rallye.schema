import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsStageParamComponent } from './details-stage-param.component';

describe('DetailsStageParamComponent', () => {
  let component: DetailsStageParamComponent;
  let fixture: ComponentFixture<DetailsStageParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsStageParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsStageParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
