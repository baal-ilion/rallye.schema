import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyStageParamComponent } from './modify-stage-param.component';

describe('ModifyStageParamComponent', () => {
  let component: ModifyStageParamComponent;
  let fixture: ComponentFixture<ModifyStageParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyStageParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyStageParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
