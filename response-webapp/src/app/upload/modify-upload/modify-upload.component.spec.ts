import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyUploadComponent } from './modify-upload.component';

describe('ModifyUploadComponent', () => {
  let component: ModifyUploadComponent;
  let fixture: ComponentFixture<ModifyUploadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModifyUploadComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModifyUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
