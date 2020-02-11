import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListStageComponent } from './list-stage.component';

describe('ListStageComponent', () => {
  let component: ListStageComponent;
  let fixture: ComponentFixture<ListStageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListStageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
