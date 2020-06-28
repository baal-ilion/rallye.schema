import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyPerformanceRangePointParamComponent } from './modify-performance-range-point-param.component';

describe('ModifyPerformanceRangePointParamComponent', () => {
  let component: ModifyPerformanceRangePointParamComponent;
  let fixture: ComponentFixture<ModifyPerformanceRangePointParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyPerformanceRangePointParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyPerformanceRangePointParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
