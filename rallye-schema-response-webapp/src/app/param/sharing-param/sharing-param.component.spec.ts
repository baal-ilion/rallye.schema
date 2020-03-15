import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SharingParamComponent } from './sharing-param.component';

describe('SharingParamComponent', () => {
  let component: SharingParamComponent;
  let fixture: ComponentFixture<SharingParamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SharingParamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SharingParamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
