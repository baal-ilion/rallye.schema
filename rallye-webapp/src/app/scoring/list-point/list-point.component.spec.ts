import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListPointComponent } from './list-point.component';

describe('ListPointComponent', () => {
  let component: ListPointComponent;
  let fixture: ComponentFixture<ListPointComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListPointComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListPointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
