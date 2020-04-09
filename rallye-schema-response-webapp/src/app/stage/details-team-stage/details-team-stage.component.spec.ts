import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsTeamStageComponent } from './details-team-stage.component';

describe('DetailsTeamStageComponent', () => {
  let component: DetailsTeamStageComponent;
  let fixture: ComponentFixture<DetailsTeamStageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsTeamStageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsTeamStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
