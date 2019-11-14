import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListResponceFileParamComponent } from './list-responce-file-param.component';

describe('ListResponceFileParamComponent', () => {
  let component: ListResponceFileParamComponent;
  let fixture: ComponentFixture<ListResponceFileParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListResponceFileParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListResponceFileParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
