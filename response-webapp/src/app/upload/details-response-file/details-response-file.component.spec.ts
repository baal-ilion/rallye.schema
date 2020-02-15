import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsResponseFileComponent } from './details-response-file.component';

describe('DetailsResponseFileComponent', () => {
  let component: DetailsResponseFileComponent;
  let fixture: ComponentFixture<DetailsResponseFileComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsResponseFileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsResponseFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
