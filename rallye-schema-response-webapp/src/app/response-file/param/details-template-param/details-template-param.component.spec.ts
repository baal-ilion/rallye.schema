import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsTemplateParamComponent } from './details-template-param.component';

describe('DetailsTemplateParamComponent', () => {
  let component: DetailsTemplateParamComponent;
  let fixture: ComponentFixture<DetailsTemplateParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsTemplateParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsTemplateParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
