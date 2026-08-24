import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigurationTransferComponent } from './configuration-transfer.component';

describe('ConfigurationTransferComponent', () => {
  let component: ConfigurationTransferComponent;
  let fixture: ComponentFixture<ConfigurationTransferComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigurationTransferComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigurationTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
