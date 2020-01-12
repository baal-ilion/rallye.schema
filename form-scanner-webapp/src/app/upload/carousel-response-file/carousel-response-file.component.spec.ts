import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CarouselResponseFileComponent } from './carousel-response-file.component';

describe('CarouselResponseFileComponent', () => {
  let component: CarouselResponseFileComponent;
  let fixture: ComponentFixture<CarouselResponseFileComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CarouselResponseFileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CarouselResponseFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
