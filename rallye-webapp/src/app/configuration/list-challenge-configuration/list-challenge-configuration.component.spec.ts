import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListChallengeConfigurationComponent } from './list-challenge-configuration.component';

describe('ListChallengeConfigurationComponent', () => {
  let component: ListChallengeConfigurationComponent;
  let fixture: ComponentFixture<ListChallengeConfigurationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListChallengeConfigurationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListChallengeConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
