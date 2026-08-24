import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyPerformanceScoringRangeComponent } from './modify-performance-scoring-range.component';

describe('ModifyPerformanceScoringRangeComponent', () => {
  let component: ModifyPerformanceScoringRangeComponent;
  let fixture: ComponentFixture<ModifyPerformanceScoringRangeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyPerformanceScoringRangeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyPerformanceScoringRangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
