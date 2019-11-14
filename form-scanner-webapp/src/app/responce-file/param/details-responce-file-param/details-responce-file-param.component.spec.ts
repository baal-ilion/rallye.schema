import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsResponceFileParamComponent } from './details-responce-file-param.component';

describe('DetailsResponceFileParamComponent', () => {
  let component: DetailsResponceFileParamComponent;
  let fixture: ComponentFixture<DetailsResponceFileParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsResponceFileParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsResponceFileParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
