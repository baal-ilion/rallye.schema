import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsResponseFileParamComponent } from './details-response-file-param.component';

describe('DetailsResponseFileParamComponent', () => {
  let component: DetailsResponseFileParamComponent;
  let fixture: ComponentFixture<DetailsResponseFileParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsResponseFileParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsResponseFileParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
