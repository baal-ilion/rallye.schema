import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { UploadFileService } from '../upload-file.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModifyUploadComponent } from '../modify-upload/modify-upload.component';
import { FormTemplate } from 'src/app/response-file/common/details-template/models/form-template';
import { Corners } from 'src/app/response-file/common/details-template/models/corners';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { CarouselResponseFileComponent } from '../carousel-response-file/carousel-response-file.component';

@Component({
  selector: 'app-details-upload',
  templateUrl: './details-upload.component.html',
  styleUrls: ['./details-upload.component.scss']
})
export class DetailsUploadComponent implements OnInit, OnChanges {

  @Input() fileUpload: any;
  @Input() dragable = true;
  @Output() deleteEvent = new EventEmitter();
  @Output() checkedEvent = new EventEmitter();

  sames = [];

  constructor(
    private uploadService: UploadFileService,
    private modalService: NgbModal,
    private confirmationDialogService: ConfirmationDialogService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.fileUpload.isFirstChange()) {
      this.loadSames();
    }
  }

  ngOnInit() {
    this.loadSames();
  }

  private loadSames() {
    if (this.fileUpload && this.fileUpload._links && this.fileUpload._links.same) {
      this.uploadService.getResource(this.fileUpload._links.same.href).subscribe(data => {
        if (data._embedded && data._embedded.responseFileInfoes) {
          this.sames = data._embedded.responseFileInfoes;
        }
        else {
          this.sames = [];
        }
      }, err => {
        console.log(err);
        this.sames = [];
      });
    }
    else {
      this.sames = [];
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

  check() {
    this.uploadService.updateResponseFileInfoCorners({
      id: this.fileUpload.id,
      checked: true
    }).subscribe(data => {
      this.fileUpload = data;
      this.checkedEvent.emit(data);
      this.ngOnInit();
    }, err => {
      console.log(err);
      this.ngOnInit();
    });
  }

  delete() {
    this.confirmationDialogService.confirm(
      'Suppresion de la feuille de réponses',
      'Supprimer cette feuille de réponses ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.uploadService.deleteResponseFile(this.fileUpload.id).subscribe(() => {
            console.log('Deleted:', this.fileUpload.id);
            this.deleteEvent.emit(this.fileUpload.id);
            this.fileUpload = null;
            this.ngOnInit();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  showSameResponseFile() {
    if (this.sames.length > 0) {
      const modalRef = this.modalService.open(CarouselResponseFileComponent);
      modalRef.componentInstance.responseFiles = this.sames;
      modalRef.result.then((result) => {
        console.log(result);
      }).catch((error) => {
        console.log(error);
      });
    }
  }
}
