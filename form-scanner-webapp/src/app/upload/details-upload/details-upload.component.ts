import { Component, OnInit, Input } from '@angular/core';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { UploadFileService } from '../upload-file.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModifyUploadComponent } from '../modify-upload/modify-upload.component';
import { FormTemplate } from 'src/app/response-file/common/details-template/models/form-template';
import { Corners } from 'src/app/response-file/common/details-template/models/corners';

@Component({
  selector: 'app-details-upload',
  templateUrl: './details-upload.component.html',
  styleUrls: ['./details-upload.component.scss']
})
export class DetailsUploadComponent implements OnInit {

  @Input() fileUpload: any;

  constructor(private uploadService: UploadFileService, private modalService: NgbModal) { }

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

  activate() {
    this.uploadService.updateResponseFileInfoCorners({
      id: this.fileUpload.id,
      active: true
    }).subscribe(data => {
      this.fileUpload = data;
      this.ngOnInit();
    }, err => {
      console.log(err);
      this.ngOnInit();
    });
  }

  check() {
    this.uploadService.updateResponseFileInfoCorners({
      id: this.fileUpload.id,
      checked: true
    }).subscribe(data => {
      this.fileUpload = data;
      this.ngOnInit();
    }, err => {
      console.log(err);
      this.ngOnInit();
    });
  }
}
