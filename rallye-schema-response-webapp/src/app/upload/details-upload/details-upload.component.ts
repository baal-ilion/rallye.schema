import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Corners } from 'src/app/response-file/common/details-template/models/corners';
import { ResponseFileInfo } from '../models/response-file-info';
import { ModifyUploadComponent } from '../modify-upload/modify-upload.component';
import { UploadFileService } from '../upload-file.service';
import { AppDialogRef, DialogService } from 'src/app/shared/dialog/dialog.service';

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
    private dialogService: DialogService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.fileUpload.isFirstChange()) {
    }
  }

  ngOnInit() {
  }

  get comparedCorrectionCount(): number {
    return Object.keys(this.fileUpload?.processingCorrectionValues || {}).length;
  }

  get correctionDifferences(): string[] {
    return this.fileUpload?.processingCorrectionDifferences || [];
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
    const modalRef = this.dialogService.open<ModifyUploadComponent>(ModifyUploadComponent);
    modalRef.componentInstance.fileUpload = this.fileUpload;
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) {
        return;
      }
      this.uploadService.updateResponseFileInfoCorners({
        id: this.fileUpload.id,
        stage: (result as any).stage,
        page: (result as any).page,
        team: (result as any).team
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
