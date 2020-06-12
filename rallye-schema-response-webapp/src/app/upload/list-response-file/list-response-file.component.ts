import { Component, HostListener, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ResponseFileInfo } from '../models/response-file-info';

const selector = 'app-list-response-file';
@Component({
  selector,
  templateUrl: './list-response-file.component.html',
  styleUrls: ['./list-response-file.component.scss']
})
export class ListResponseFileComponent implements OnInit {
  @Input() responseFiles: ResponseFileInfo[];
  page = 1;

  constructor(public activeModal: NgbActiveModal, private modalService: NgbModal) { }

  ngOnInit() {
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
    return !target || target?.getElementsByTagName(selector.toUpperCase()).length > 0;
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
