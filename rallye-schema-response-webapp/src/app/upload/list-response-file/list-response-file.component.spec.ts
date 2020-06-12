import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ListResponseFileComponent } from './list-response-file.component';


describe('ListResponseFileComponent', () => {
  let component: ListResponseFileComponent;
  let fixture: ComponentFixture<ListResponseFileComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ListResponseFileComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListResponseFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
