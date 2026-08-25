import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyTeamComponent } from './modify-team.component';

describe('ModifyTeamComponent', () => {
  let component: ModifyTeamComponent;
  let fixture: ComponentFixture<ModifyTeamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyTeamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
