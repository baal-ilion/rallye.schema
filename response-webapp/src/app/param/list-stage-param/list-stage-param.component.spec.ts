import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListStageParamComponent } from './list-stage-param.component';

describe('ListStageParamComponent', () => {
  let component: ListStageParamComponent;
  let fixture: ComponentFixture<ListStageParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListStageParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListStageParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
