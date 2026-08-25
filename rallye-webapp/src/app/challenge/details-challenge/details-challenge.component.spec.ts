import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsChallengeComponent } from './details-challenge.component';

describe('DetailsChallengeComponent', () => {
  let component: DetailsChallengeComponent;
  let fixture: ComponentFixture<DetailsChallengeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsChallengeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsChallengeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
