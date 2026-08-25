import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ListSubmittedFormComponent } from './list-submitted-form.component';


describe('ListSubmittedFormComponent', () => {
  let component: ListSubmittedFormComponent;
  let fixture: ComponentFixture<ListSubmittedFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ListSubmittedFormComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListSubmittedFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
