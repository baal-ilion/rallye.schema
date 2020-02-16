import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsPointComponent } from './details-point.component';

describe('DetailsPointComponent', () => {
  let component: DetailsPointComponent;
  let fixture: ComponentFixture<DetailsPointComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsPointComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsPointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
