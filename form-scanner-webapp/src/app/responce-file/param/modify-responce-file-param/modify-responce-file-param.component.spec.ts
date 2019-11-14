import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyResponceFileParamComponent } from './modify-responce-file-param.component';

describe('ModifyResponceFileParamComponent', () => {
  let component: ModifyResponceFileParamComponent;
  let fixture: ComponentFixture<ModifyResponceFileParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyResponceFileParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyResponceFileParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
