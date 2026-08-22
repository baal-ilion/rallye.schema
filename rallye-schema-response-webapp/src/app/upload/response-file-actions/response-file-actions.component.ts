import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalCollection } from 'src/app/models/hal-collection';
import { HalLink } from 'src/app/models/hal-link';
import { AppDialogRef, DialogService } from 'src/app/shared/dialog/dialog.service';
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
  @Input() context: 'verification' | 'validation' = 'verification';
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() checkedEvent = new EventEmitter<ResponseFileInfo>();

  isSelected = false;
  selecteds: ResponseFileInfo[] = [];
  sameFiles: ResponseFileInfo[] = [];
  actionError = '';
  loading = true;

  constructor(
    private uploadService: UploadFileService,
    private stageService: StageService,
    private dialogService: DialogService,
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
    this.selecteds = [];
    this.sameFiles = [];
  }

  private async initialize() {
    console.log('initialize');
    this.loading = true;
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
    this.sameFiles = this.responseFileInfo ? [this.responseFileInfo, ...same] : same;
    this.selecteds = same.filter(f => selectedResponseFileIds.includes(f.id));
    this.loading = false;
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
	this.actionError = '';
    this.stageService.selectResponseFile(
      this.responseFileInfo.stage,
      this.responseFileInfo.team,
      this.responseFileInfo.id,
      false
    ).subscribe(() => {
      // Marquer la feuille comme acceptée côté UI
      this.responseFileInfo.checked = true;
      this.checkedEvent.emit(this.responseFileInfo);
      this.ngOnInit();
    }, err => {
	  this.showActionError(err);
      this.ngOnInit();
    });
  }

  uncheck() {
    this.actionError = '';
    this.confirmationDialogService.confirm(
      'Renvoyer la feuille vers le traitement',
      'Renvoyer cette feuille vers le traitement des formulaires ? Les corrections manuelles O/N/Y de cette page seront réinitialisées et l’épreuve sera dévalidée.',
      'Oui', 'Non')
      .then(confirmed => {
        if (!confirmed) return;
        this.stageService.releaseResponseFile(
          this.responseFileInfo.stage,
          this.responseFileInfo.team,
          this.responseFileInfo.id
        ).subscribe(() => {
          this.responseFileInfo.checked = false;
          this.checkedEvent.emit(this.responseFileInfo);
        }, err => this.showActionError(err));
      }).catch(() => undefined);
  }

  delete() {
	this.actionError = '';
    this.confirmationDialogService.confirm(
      'Suppression de la feuille de réponses',
      this.context === 'validation'
        ? 'Supprimer définitivement cette feuille ? L’épreuve sera dévalidée et les corrections manuelles O/N/Y de cette page seront réinitialisées.'
        : 'Supprimer définitivement cette feuille de réponses ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          const deletion = this.context === 'validation'
            ? this.stageService.deleteSelectedResponseFile(
                this.responseFileInfo.stage, this.responseFileInfo.team, this.responseFileInfo.id)
            : this.uploadService.deleteResponseFile(this.responseFileInfo.id);
          deletion.subscribe(() => {
            console.log('Deleted:', this.responseFileInfo.id);
            this.deleteEvent.emit(this.responseFileInfo.id);
          }, err => {
            this.showActionError(err);
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  openDuplicateComparison() {
    if (this.sameFiles.length < 2) return;
    const modalRef: AppDialogRef<ListResponseFileComponent> = this.dialogService.open(ListResponseFileComponent, { size: 'xl' });
    modalRef.componentInstance.responseFiles = this.sameFiles;
    modalRef.componentInstance.selectedResponseFileId = this.isSelected
      ? this.responseFileInfo.id
      : this.selecteds[0]?.id;
    modalRef.result.then((result) => {
      if (result) {
        this.checkedEvent.emit(result as ResponseFileInfo);
        this.ngOnInit();
      }
    }).catch(() => undefined);
  }

  private showActionError(error: any) {
	this.actionError = error?.error?.message
	  || 'Impossible d’accepter le formulaire. Vérifiez que l’équipe, l’épreuve et la page existent.';
	console.error(this.actionError, error);
  }
}
