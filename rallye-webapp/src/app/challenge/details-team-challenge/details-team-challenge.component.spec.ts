import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsTeamChallengeComponent } from './details-team-challenge.component';

describe('DetailsTeamChallengeComponent', () => {
  let component: DetailsTeamChallengeComponent;
  let fixture: ComponentFixture<DetailsTeamChallengeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsTeamChallengeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsTeamChallengeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
