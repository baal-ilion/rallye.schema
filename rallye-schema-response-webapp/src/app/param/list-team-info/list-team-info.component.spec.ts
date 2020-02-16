import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListTeamInfoComponent } from './list-team-info.component';

describe('ListTeamInfoComponent', () => {
  let component: ListTeamInfoComponent;
  let fixture: ComponentFixture<ListTeamInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListTeamInfoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListTeamInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
