import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyChallengeConfigurationComponent } from './modify-challenge-configuration.component';

describe('ModifyChallengeConfigurationComponent', () => {
  let component: ModifyChallengeConfigurationComponent;
  let fixture: ComponentFixture<ModifyChallengeConfigurationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyChallengeConfigurationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyChallengeConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
