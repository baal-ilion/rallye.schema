import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsTeamComponent } from './details-team.component';

describe('DetailsTeamComponent', () => {
  let component: DetailsTeamComponent;
  let fixture: ComponentFixture<DetailsTeamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsTeamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
