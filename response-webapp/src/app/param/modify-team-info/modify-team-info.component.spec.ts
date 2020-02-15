import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyTeamInfoComponent } from './modify-team-info.component';

describe('ModifyTeamInfoComponent', () => {
  let component: ModifyTeamInfoComponent;
  let fixture: ComponentFixture<ModifyTeamInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyTeamInfoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyTeamInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
