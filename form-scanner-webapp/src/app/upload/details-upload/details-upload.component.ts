import { Component, OnInit, Input } from '@angular/core';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { UploadFileService } from '../upload-file.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModifyUploadComponent } from '../modify-upload/modify-upload.component';

@Component({
  selector: 'app-details-upload',
  templateUrl: './details-upload.component.html',
  styleUrls: ['./details-upload.component.scss']
})
export class DetailsUploadComponent implements OnInit {

  @Input() fileUpload: any;

  points = [];
  questions = [];
  topLeftCorner: any;
  bottomLeftCorner: any;
  bottomRightCorner: any;
  topRightCorner: any;

  constructor(private uploadService: UploadFileService, private modalService: NgbModal) { }

  ngOnInit() {
    const height = this.fileUpload.filledForm.height;
    const width = this.fileUpload.filledForm.width;
    const squareHeight = 30 * 100 / 2800;
    const squareWidth = 30 * 100 / 1700;

    this.topLeftCorner = {
      top: this.fileUpload.filledForm.corners.TOP_LEFT.y * 100 / height,
      left: this.fileUpload.filledForm.corners.TOP_LEFT.x * 100 / width,
      width: squareWidth, height: squareHeight
    };
    this.bottomLeftCorner = {
      top: this.fileUpload.filledForm.corners.BOTTOM_LEFT.y * 100 / height,
      left: this.fileUpload.filledForm.corners.BOTTOM_LEFT.x * 100 / width,
      width: squareWidth, height: squareHeight
    };
    this.bottomRightCorner = {
      top: this.fileUpload.filledForm.corners.BOTTOM_RIGHT.y * 100 / height,
      left: this.fileUpload.filledForm.corners.BOTTOM_RIGHT.x * 100 / width,
      width: squareWidth, height: squareHeight
    };
    this.topRightCorner = {
      top: this.fileUpload.filledForm.corners.TOP_RIGHT.y * 100 / height,
      left: this.fileUpload.filledForm.corners.TOP_RIGHT.x * 100 / width,
      width: squareWidth, height: squareHeight
    };

    const fields = this.fileUpload.filledForm.groups.EMPTY.fields;
    this.points = [];
    this.questions = [];
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
      this.questions.push({
        name: field,
        result: resultValue
      });
      let pointClass = 'default-point';
      if (resultValue === true) {
        pointClass = 'valid-point';
      } else if (resultValue === false) {
        pointClass = 'invalid-point';
      }

      for (const point of pointKeys) {
        if (points[point]) {
          this.points.push({
            top: points[point].y * 100 / height,
            left: points[point].x * 100 / width,
            width: squareWidth, height: squareHeight,
            class: pointClass
          });
        }
      }
    }
  }

  endDrag(event: CdkDragEnd, corner: any) {
    const pos = event.source.getFreeDragPosition();
    const top = pos.y * 100 / event.source.element.nativeElement.parentElement.offsetHeight;
    const left = pos.x * 100 / event.source.element.nativeElement.parentElement.offsetWidth;
    corner.top += top;
    corner.left += left;
    event.source.reset();


    const height = this.fileUpload.filledForm.height;
    const width = this.fileUpload.filledForm.width;
    this.uploadService.updateResponceFileInfoCorners({
      id: this.fileUpload.id,
      filledForm: {
        corners: {
          TOP_LEFT: {
            x: width * this.topLeftCorner.left / 100,
            y: height * this.topLeftCorner.top / 100
          },
          BOTTOM_LEFT: {
            x: width * this.bottomLeftCorner.left / 100,
            y: height * this.bottomLeftCorner.top / 100
          },
          BOTTOM_RIGHT: {
            x: width * this.bottomRightCorner.left / 100,
            y: height * this.bottomRightCorner.top / 100
          },
          TOP_RIGHT: {
            x: width * this.topRightCorner.left / 100,
            y: height * this.topRightCorner.top / 100
          }
        }
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
      this.uploadService.updateResponceFileInfoCorners({
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
    this.uploadService.updateResponceFileInfoCorners({
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
    this.uploadService.updateResponceFileInfoCorners({
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
