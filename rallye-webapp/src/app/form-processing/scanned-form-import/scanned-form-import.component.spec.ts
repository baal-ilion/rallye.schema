import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ScannedFormImportComponent } from './scanned-form-import.component';

describe('ScannedFormImportComponent', () => {
  let component: ScannedFormImportComponent;
  let fixture: ComponentFixture<ScannedFormImportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ScannedFormImportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScannedFormImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
