import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalCollection } from 'src/app/models/hal-collection';
import { HalLink } from 'src/app/models/hal-link';
import { isResponseFileSource } from 'src/app/stage/models/response-file-source';
import { StageResult } from 'src/app/stage/models/stage-result';
import { StageService } from 'src/app/stage/stage.service';
import { ListResponseFileComponent } from '../list-response-file/list-response-file.component';
import { ResponseFileInfo } from '../models/response-file-info';
import { UploadFileService } from '../upload-file.service';

@Component({
  selector: 'app-response-file-actions',
  templateUrl: './response-file-actions.component.html',
  styleUrls: ['./response-file-actions.component.scss']
})
export class ResponseFileActionsComponent implements OnInit, OnChanges {

  @Input() responseFileInfo: ResponseFileInfo;
  @Input() viewOtherFiles = true;
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() checkedEvent = new EventEmitter<ResponseFileInfo>();

  isSelected = false;
  selecteds: ResponseFileInfo[] = [];
  selectables: ResponseFileInfo[] = [];

  constructor(
    private uploadService: UploadFileService,
    private stageService: StageService,
    private modalService: NgbModal,
    private confirmationDialogService: ConfirmationDialogService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.responseFileInfo.isFirstChange()) {
      this.initialize();
    }
  }

  ngOnInit(): void {
    this.initialize().then(() => { }).catch(err => console.error(err));
  }

  private clear(): void {
    this.isSelected = false;
    this.selectables = [];
    this.selecteds = [];
  }

  private async initialize() {
    console.log('initialize');
    this.clear();
    const samePromise = this.loadSame(this.responseFileInfo?._links?.same as HalLink);
    const stagePromise = this.stageService.findStage(this.responseFileInfo?.stage, this.responseFileInfo?.team).toPromise();
    let stageResult: StageResult;
    try {
      stageResult = await stagePromise;
    } catch (error) {
      console.log(error);
    }
    const selectedResponseFileIds = stageResult?.responseSources?.filter(isResponseFileSource).map(s => s.id) ?? [];
    this.isSelected = selectedResponseFileIds.includes(this.responseFileInfo?.id);
    let same: ResponseFileInfo[] = [];
    try {
      same = (await samePromise) ?? [];
    } catch (error) {
      console.log(error);
    }
    this.selecteds = same.filter(f => selectedResponseFileIds.includes(f.id));
    this.selectables = same.filter(f => f.id !== this.responseFileInfo?.id && f.checked);
  }

  private async loadSame(same: HalLink): Promise<ResponseFileInfo[]> {
    if (same?.href) {
      try {
        const sames = await this.uploadService.getResource<HalCollection<ResponseFileInfo>>(same.href)
          .toPromise();
        return sames?._embedded?.responseFileInfoes ?? [];
      } catch (error) {
        console.log(error);
      }
    }
    return [];
  }

  check() {
    this.uploadService.updateResponseFileInfoCorners({
      id: this.responseFileInfo.id,
      checked: true
    }).subscribe(data => {
      this.responseFileInfo = data;
      this.checkedEvent.emit(data);
      this.ngOnInit();
    }, err => {
      console.log(err);
      this.ngOnInit();
    });
  }

  uncheck() {
    this.uploadService.updateResponseFileInfoCorners({
      id: this.responseFileInfo.id,
      checked: false
    }).subscribe(data => {
      this.responseFileInfo = data;
      this.checkedEvent.emit(data);
      this.ngOnInit();
    }, err => {
      console.log(err);
      this.ngOnInit();
    });
  }

  replace() {
    this.stageService.selectResponseFile(
      this.responseFileInfo.stage,
      this.responseFileInfo.team,
      this.responseFileInfo.id,
      false).subscribe(data => {
        this.responseFileInfo = data;
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
          this.uploadService.deleteResponseFile(this.responseFileInfo.id).subscribe(() => {
            console.log('Deleted:', this.responseFileInfo.id);
            this.deleteEvent.emit(this.responseFileInfo.id);
            this.responseFileInfo = null;
            this.ngOnInit();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  showSelectedResponseFile() {
    if (this.selectables.length > 0) {
      const modalRef = this.modalService.open(ListResponseFileComponent, { size: 'xl' });
      modalRef.componentInstance.responseFiles = this.selecteds;
      modalRef.result.then((result) => {
        console.log(result);
        if (result) {
          this.checkedEvent.emit(this.responseFileInfo);
          this.ngOnInit();
        }
      }).catch((error) => {
        console.log(error);
      });
    }
  }

  showSelectablesResponseFile() {
    if (this.selectables.length > 0) {
      const modalRef = this.modalService.open(ListResponseFileComponent, { size: 'xl' });
      modalRef.componentInstance.responseFiles = this.selectables;
      modalRef.result.then((result) => {
        console.log(result);
        if (result) {
          this.checkedEvent.emit(this.responseFileInfo);
          this.ngOnInit();
        }
      }).catch((error) => {
        console.log(error);
      });
    }
  }

  get displaySelectedResponseFile(): boolean { return this.viewOtherFiles && !this.isSelected && this.selecteds.length > 0; }
  get displaySelectablesResponseFile(): boolean { return this.viewOtherFiles && this.isSelected && this.selectables.length > 0; }
  get displayKeptResponseFile(): boolean { return !this.responseFileInfo.checked && this.selecteds.length > 0; }
}
