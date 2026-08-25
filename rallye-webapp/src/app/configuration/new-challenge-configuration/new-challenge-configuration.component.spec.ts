import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NewChallengeConfigurationComponent } from './new-challenge-configuration.component';

describe('NewChallengeConfigurationComponent', () => {
  let component: NewChallengeConfigurationComponent;
  let fixture: ComponentFixture<NewChallengeConfigurationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NewChallengeConfigurationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewChallengeConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
