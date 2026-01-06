import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { AppConfigService } from 'src/app/app-config.service';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { DatabaseMaintenanceService, ConsistencyIssue, ConsistencyReport } from './database-maintenance.service';

@Component({
  selector: 'app-database-maintenance',
  templateUrl: './database-maintenance.component.html',
  styleUrls: ['./database-maintenance.component.scss']
})
export class DatabaseMaintenanceComponent {
  @ViewChild('restoreFileInput') restoreFileInput: ElementRef<HTMLInputElement>;

  backupLink = AppConfigService.settings.apiUrl.rallyeSchema + '/database/backup';
  uploadProgress = 0;
  uploading = false;
  statusMessage: string | null = null;
  errorMessage: string | null = null;
  erasing = false;
  analyzing = false;
  fixing = false;
  consistencyIssues: ConsistencyIssue[] = [];
  consistencyInfo: string | null = null;

  constructor(
    private databaseMaintenanceService: DatabaseMaintenanceService,
    private confirmationDialogService: ConfirmationDialogService
  ) { }

  clearMessages() {
    this.statusMessage = null;
    this.errorMessage = null;
    this.consistencyInfo = null;
  }

  onRestoreSelection(files: FileList | null) {
    this.clearMessages();
    if (!files || files.length === 0) {
      return;
    }
    const file = files.item(0);
    this.confirmationDialogService.confirm(
      'Restauration de la base',
      'Cette opération remplace l’ensemble des données actuelles par celles du fichier fourni. Continuer ?',
      'Restaurer', 'Annuler'
    ).then(confirmed => {
      if (confirmed && file) {
        this.restoreDatabase(file);
      } else {
        this.resetFileInput();
      }
    }).catch(() => {
      this.resetFileInput();
    });
  }

  restoreDatabase(file: File) {
    this.uploading = true;
    this.uploadProgress = 0;
    this.statusMessage = null;
    this.errorMessage = null;
    this.databaseMaintenanceService.restoreDatabase(file).pipe(
      finalize(() => {
        this.uploading = false;
        this.resetFileInput();
      })
    ).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event instanceof HttpResponse) {
          this.uploadProgress = 100;
          this.statusMessage = 'Restauration terminée. La base a été remplacée par le contenu du fichier.';
        }
      },
      error: () => {
        this.errorMessage = 'Echec de la restauration. Vérifiez le fichier et réessayez.';
      }
    });
  }

  confirmErase() {
    this.clearMessages();
    this.confirmationDialogService.confirm(
      'Effacement complet',
      'Cette action vide entièrement la base de données. Aucune sauvegarde ne sera conservée. Confirmer l’effacement ?',
      'Effacer', 'Annuler'
    ).then(confirmed => {
      if (confirmed) {
        this.eraseDatabase();
      }
    });
  }

  eraseDatabase() {
    this.erasing = true;
    this.statusMessage = null;
    this.errorMessage = null;
    this.databaseMaintenanceService.eraseDatabase().pipe(
      finalize(() => this.erasing = false)
    ).subscribe({
      next: () => {
        this.statusMessage = 'La base a été vidée.';
      },
      error: () => {
        this.errorMessage = 'Echec de la suppression complète de la base.';
      }
    });
  }

  analyzeConsistency() {
    this.analyzing = true;
    this.consistencyInfo = null;
    this.databaseMaintenanceService.getConsistencyReport().pipe(
      finalize(() => this.analyzing = false)
    ).subscribe({
      next: (report: ConsistencyReport) => {
        this.consistencyIssues = report.issues || [];
        this.consistencyInfo = this.consistencyIssues.length === 0
          ? 'Aucune incohérence détectée.'
          : `${report.remaining ?? this.consistencyIssues.reduce((acc, i) => acc + i.count, 0)} incohérence(s) trouvée(s).`;
      },
      error: () => {
        this.errorMessage = 'Analyse impossible pour le moment.';
      }
    });
  }

  fixConsistency() {
    this.fixing = true;
    this.consistencyInfo = null;
    this.databaseMaintenanceService.fixConsistency().pipe(
      finalize(() => this.fixing = false)
    ).subscribe({
      next: (report: ConsistencyReport) => {
        this.consistencyIssues = report.issues || [];
        const fixed = report.autoFixApplied || 0;
        const remaining = report.remaining ?? this.consistencyIssues.reduce((acc, i) => acc + i.count, 0);
        this.consistencyInfo = `Corrections appliquées : ${fixed}. Restant : ${remaining}.`;
      },
      error: () => {
        this.errorMessage = 'Echec de la correction automatique.';
      }
    });
  }

  private resetFileInput() {
    if (this.restoreFileInput) {
      this.restoreFileInput.nativeElement.value = '';
    }
  }
}
