import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyResponseFileParamComponent } from './modify-response-file-param.component';

describe('ModifyResponseFileParamComponent', () => {
  let component: ModifyResponseFileParamComponent;
  let fixture: ComponentFixture<ModifyResponseFileParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyResponseFileParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyResponseFileParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
