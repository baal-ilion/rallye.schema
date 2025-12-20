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
  selectedCodes = new Set<string>();

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
      'Cette op\u00e9ration remplace l\u2019ensemble des donn\u00e9es actuelles par celles du fichier fourni. Continuer\u00a0?',
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
          this.statusMessage = 'Restauration termin\u00e9e. La base a \u00e9t\u00e9 remplac\u00e9e par le contenu du fichier.';
        }
      },
      error: () => {
        this.errorMessage = 'Echec de la restauration. V\u00e9rifiez le fichier et r\u00e9essayez.';
      }
    });
  }

  confirmErase() {
    this.clearMessages();
    this.confirmationDialogService.confirm(
      'Effacement complet',
      'Cette action vide enti\u00e8rement la base de donn\u00e9es. Aucune sauvegarde ne sera conserv\u00e9e. Confirmer l\u2019effacement\u00a0?',
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
        this.statusMessage = 'La base a \u00e9t\u00e9 vid\u00e9e.';
      },
      error: () => {
        this.errorMessage = 'Echec de la suppression compl\u00e8te de la base.';
      }
    });
  }

  analyzeConsistency() {
    this.analyzing = true;
    this.consistencyInfo = null;
    this.selectedCodes.clear();
    this.databaseMaintenanceService.getConsistencyReport().pipe(
      finalize(() => this.analyzing = false)
    ).subscribe({
      next: (report: ConsistencyReport) => {
        this.consistencyIssues = report.issues || [];
        // pré-sélectionner tout ce qui est auto-fixable
        this.consistencyIssues.filter(i => i.autoFixable).forEach(i => this.selectedCodes.add(i.code));
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

  fixSelected() {
    if (this.selectedCodes.size === 0) {
      this.consistencyInfo = 'Sélectionnez au moins un type d’incohérence à corriger.';
      return;
    }
    this.fixing = true;
    this.consistencyInfo = null;
    const codes = Array.from(this.selectedCodes);
    this.databaseMaintenanceService.fixConsistencySelected(codes).pipe(
      finalize(() => this.fixing = false)
    ).subscribe({
      next: (report: ConsistencyReport) => {
        this.consistencyIssues = report.issues || [];
        const fixed = report.autoFixApplied || 0;
        const remaining = report.remaining ?? this.consistencyIssues.reduce((acc, i) => acc + i.count, 0);
        this.consistencyInfo = `Corrections appliquées (sélection) : ${fixed}. Restant : ${remaining}.`;
        // mettre à jour la sélection sur les issues restantes auto-fixables
        this.selectedCodes.clear();
        this.consistencyIssues.filter(i => i.autoFixable).forEach(i => this.selectedCodes.add(i.code));
      },
      error: () => {
        this.errorMessage = 'Echec de la correction (sélection).';
      }
    });
  }

  toggleIssueSelection(code: string, checked: boolean) {
    if (checked) {
      this.selectedCodes.add(code);
    } else {
      this.selectedCodes.delete(code);
    }
  }

  private resetFileInput() {
    if (this.restoreFileInput) {
      this.restoreFileInput.nativeElement.value = '';
    }
  }
}
