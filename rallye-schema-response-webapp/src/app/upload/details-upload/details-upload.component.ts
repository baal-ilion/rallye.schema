import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Corners } from 'src/app/response-file/common/details-template/models/corners';
import { ResponseFileInfo } from '../models/response-file-info';
import { ModifyUploadComponent } from '../modify-upload/modify-upload.component';
import { UploadFileService } from '../upload-file.service';

@Component({
  selector: 'app-details-upload',
  templateUrl: './details-upload.component.html',
  styleUrls: ['./details-upload.component.scss']
})
export class DetailsUploadComponent implements OnInit, OnChanges {

  @Input() fileUpload: any;
  @Input() dragable = true;
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() checkedEvent = new EventEmitter<ResponseFileInfo>();

  constructor(
    private uploadService: UploadFileService,
    private modalService: NgbModal) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.fileUpload.isFirstChange()) {
    }
  }

  ngOnInit() {
  }

  endDrag(event: Corners) {
    this.uploadService.updateResponseFileInfoCorners({
      id: this.fileUpload.id,
      filledForm: {
        corners: event
      }
    }).subscribe(data => {
      this.fileUpload = data;
      this.ngOnInit();
    }, err => {
      console.log(err);
      this.ngOnInit();
    });
  }

  openModifyUpload() {
    const modalRef = this.modalService.open(ModifyUploadComponent);
    modalRef.componentInstance.fileUpload = this.fileUpload;
    modalRef.result.then((result) => {
      console.log(result);
      this.uploadService.updateResponseFileInfoCorners({
        id: this.fileUpload.id,
        stage: result.stage,
        page: result.page,
        team: result.team
      }).subscribe(data => {
        this.fileUpload = data;
        this.ngOnInit();
      }, err => {
        console.log(err);
        this.ngOnInit();
      });
    }).catch((error) => {
      console.log(error);
    });
  }

  check(event: ResponseFileInfo) {
    this.checkedEvent.emit(event);
    this.ngOnInit();
  }

  delete(event: string) {
    this.deleteEvent.emit(event);
    this.fileUpload = null;
    this.ngOnInit();
  }
}
