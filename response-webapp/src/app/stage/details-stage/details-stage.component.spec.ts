import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsStageComponent } from './details-stage.component';

describe('DetailsStageComponent', () => {
  let component: DetailsStageComponent;
  let fixture: ComponentFixture<DetailsStageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsStageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
