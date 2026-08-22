import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { StageService } from 'src/app/stage/stage.service';
import { ResponseFileInfo } from '../models/response-file-info';
import { UploadFileService } from '../upload-file.service';

@Component({
  selector: 'app-list-response-file',
  templateUrl: './list-response-file.component.html',
  styleUrls: ['./list-response-file.component.scss']
})
export class ListResponseFileComponent implements OnInit {
  @Input() responseFiles: ResponseFileInfo[];
  @Input() selectedResponseFileId?: string;
  page = 1;
  actionBusy = false;
  actionError = '';

  constructor(
    public dialogRef: MatDialogRef<ListResponseFileComponent>,
    private elementRef: ElementRef,
    private stageService: StageService,
    private uploadService: UploadFileService,
    private confirmationDialogService: ConfirmationDialogService) { }

  ngOnInit() {
    console.log(this.elementRef);
  }

  get selectedResponseFile(): ResponseFileInfo | undefined {
    return this.responseFiles?.find(responseFile => responseFile.id === this.selectedResponseFileId);
  }

  get candidates(): ResponseFileInfo[] {
    return (this.responseFiles ?? []).filter(responseFile => responseFile.id !== this.selectedResponseFileId);
  }

  get candidate(): ResponseFileInfo | undefined {
    return this.candidates[this.page - 1];
  }

  useCandidate(): void {
    const responseFile = this.candidate;
    if (!responseFile || this.actionBusy) return;
    this.actionBusy = true;
    this.actionError = '';
    this.stageService.selectResponseFile(responseFile.stage, responseFile.team, responseFile.id, true)
      .subscribe(() => this.dialogRef.close(responseFile), error => {
        this.actionBusy = false;
        this.actionError = error?.error?.message || 'Impossible d’utiliser cette feuille.';
      });
  }

  async deleteCandidate(): Promise<void> {
    const responseFile = this.candidate;
    if (!responseFile || this.actionBusy) return;
    const confirmed = await this.confirmationDialogService.confirm(
      'Suppression du doublon',
      'Supprimer définitivement cette feuille ? La feuille actuellement utilisée sera conservée.',
      'Oui', 'Non').catch(() => false);
    if (!confirmed) return;
    this.actionBusy = true;
    this.actionError = '';
    this.uploadService.deleteResponseFile(responseFile.id).subscribe(() => {
      this.delete(responseFile);
      this.actionBusy = false;
    }, error => {
      this.actionBusy = false;
      this.actionError = error?.error?.message || 'Impossible de supprimer cette feuille.';
    });
  }

  delete(responseFile: ResponseFileInfo) {
    const idx = this.responseFiles.findIndex(r => r.id === responseFile.id);
    if (idx >= 0) {
      this.responseFiles.splice(idx, 1);
    }
    const candidateCount = this.candidates.length;
    if (candidateCount === 0) {
      this.dialogRef.close(responseFile);
      return;
    }
    this.page = Math.min(this.page, candidateCount);
  }

  check(event: ResponseFileInfo) {
    this.dialogRef.close(event);
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
    while (target) {
      if (this.elementRef.nativeElement.contains(target)) {
        return true;
      }
      target = target.parentElement;
    }
    return false;
  }

  next() {
    if (this.page < this.candidates.length) {
      this.page++;
    }
  }

  previous() {
    if (this.page > 1) {
      this.page--;
    }
  }
}
