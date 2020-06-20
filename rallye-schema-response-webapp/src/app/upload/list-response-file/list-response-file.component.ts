import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ResponseFileInfo } from '../models/response-file-info';

@Component({
  selector: 'app-list-response-file',
  templateUrl: './list-response-file.component.html',
  styleUrls: ['./list-response-file.component.scss']
})
export class ListResponseFileComponent implements OnInit {
  @Input() responseFiles: ResponseFileInfo[];
  page = 1;

  constructor(
    public activeModal: NgbActiveModal,
    private elementRef: ElementRef) { }

  ngOnInit() {
    console.log(this.elementRef);
  }

  delete(responseFile: ResponseFileInfo) {
    const idx = this.responseFiles.findIndex(r => r.id === responseFile.id);
    if (idx) {
      this.responseFiles.splice(idx, 1);
    }
    if (this.responseFiles.length === 0)
      this.activeModal.close(responseFile);
  }

  check(event: ResponseFileInfo) {
    this.activeModal.close(event);
  }


  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' && this.contains(event)) {
      this.next();
    }
    if (event.key === 'ArrowLeft' && this.contains(event)) {
      this.previous();
    }
  }

  private contains(event: KeyboardEvent): boolean {
    let target = event.target as HTMLElement;
    const modalWindow = 'ngb-modal-window'.toUpperCase();
    while (target && target.tagName !== modalWindow) {
      target = target.parentElement;
    }
    return !target || target?.contains(this.elementRef.nativeElement);
  }

  next() {
    if (this.page < this.responseFiles.length) {
      this.page++;
    }
  }

  previous() {
    if (this.page > 1) {
      this.page--;
    }
  }
}
