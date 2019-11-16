import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListResponseFileParamComponent } from './list-response-file-param.component';

describe('ListResponseFileParamComponent', () => {
  let component: ListResponseFileParamComponent;
  let fixture: ComponentFixture<ListResponseFileParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListResponseFileParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListResponseFileParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
