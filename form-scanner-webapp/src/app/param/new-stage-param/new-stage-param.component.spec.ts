import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NewStageParamComponent } from './new-stage-param.component';

describe('NewStageParamComponent', () => {
  let component: NewStageParamComponent;
  let fixture: ComponentFixture<NewStageParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NewStageParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewStageParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
