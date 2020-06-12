import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponseFileActionsComponent } from './response-file-actions.component';

describe('ResponseFileActionsComponent', () => {
  let component: ResponseFileActionsComponent;
  let fixture: ComponentFixture<ResponseFileActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ResponseFileActionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ResponseFileActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
