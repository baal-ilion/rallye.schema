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

  template: FormTemplate;

  constructor(private uploadService: UploadFileService, private modalService: NgbModal) { }

  ngOnInit() {
    this.loadTemplate(this.fileUpload);
  }

  loadTemplate(fileUpload) {
    this.template = new FormTemplate();
    this.template.fileUrl = 'http://localhost:8080/downloadResponseFile/' + fileUpload.id;
    this.template.square = fileUpload.filledForm.size;
    this.template.height = fileUpload.filledForm.height;
    this.template.width = fileUpload.filledForm.width;
    if (fileUpload.filledForm.parentTemplate) {
      this.template.initialHeight = fileUpload.filledForm.parentTemplate.height;
      this.template.initialWidth = fileUpload.filledForm.parentTemplate.width;
    }
    this.template.corners = fileUpload.filledForm.corners;

    const groups = fileUpload.filledForm.groups;
    const groupKeys = Object.keys(groups).sort();
    for (const group of groupKeys) {
      const fields = groups[group].fields;
      const fieldKeys = Object.keys(fields).sort();
      for (const field of fieldKeys) {
        const points = fields[field].points;
        const pointKeys = Object.keys(points);
        let resultValue = null;
        if (pointKeys.includes('O')) {
          resultValue = true;
        } else if (pointKeys.includes('N')) {
          resultValue = false;
        } else if (pointKeys.includes('Y')) {
          resultValue = true;
        }
        let commentTxt = field;
        if (resultValue === null) {
          commentTxt += ' : ' + pointKeys.join(', ');
        } else {
          commentTxt += resultValue ? ' : Ok' : ' : Ko';
        }

        for (const point of pointKeys) {
          if (points[point]) {
            this.template.points.push({
              point: points[point],
              valid: resultValue,
              comment: commentTxt
            });
          }
        }
      }
    }

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
