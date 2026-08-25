import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LogFilesComponent } from './log-files.component';

describe('LogFilesComponent', () => {
  let component: LogFilesComponent;
  let fixture: ComponentFixture<LogFilesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LogFilesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LogFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
