import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListChallengeComponent } from './list-challenge.component';

describe('ListChallengeComponent', () => {
  let component: ListChallengeComponent;
  let fixture: ComponentFixture<ListChallengeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListChallengeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListChallengeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
