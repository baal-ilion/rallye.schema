import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AppConfigService } from 'src/app/app-config.service';
import { HttpResponse, HttpEventType } from '@angular/common/http';
import { ConfigurationTransferService } from '../configuration-transfer.service';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';

@Component({
  selector: 'app-configuration-transfer',
  templateUrl: './configuration-transfer.component.html',
  styleUrls: ['./configuration-transfer.component.scss']
})
export class ConfigurationTransferComponent implements OnInit {
  @ViewChild('importFile')
  importFile: ElementRef;

  exportUrl = AppConfigService.settings.apiUrl.rallyeSchema + '/sharing/configuration';
  uploadedFiles: { file: File, progress: { percentage: number } }[] = [];
  importStatus = '';
  importError = '';

  constructor(private configurationTransferService: ConfigurationTransferService, private confirmationDialogService: ConfirmationDialogService) { }

  ngOnInit(): void {
  }

  upload(files: FileList) {
    this.uploadedFiles = [];
    if (0 < files.length) {
      const file = files[0];
      this.confirmationDialogService.confirm(
        'Import du paramétrage',
        'Cette opération est irréversible.\nVoulez-vous remplacer le paramétrage actuel par celui du fichier : ' + file.name + '\u00A0?',
        'Oui', 'Non')
        .then((confirmed) => {
          console.log('User confirmed:', confirmed);
          if (confirmed) {
            this.uploadFile(file);
          }
          this.importFile.nativeElement.value = '';
        })
        .catch(() => {
          this.importFile.nativeElement.value = '';
          console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
        });
    }
  }

  uploadFile(fileToUpload) {
    this.importStatus = 'Import du paramétrage en cours…';
    this.importError = '';
    const uploadedFile = { file: fileToUpload, progress: { percentage: 0 } };
    this.uploadedFiles.push(uploadedFile);

    this.configurationTransferService.importConfigurationArchive(uploadedFile.file).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        uploadedFile.progress.percentage = Math.round(100 * event.loaded / event.total);
      } else if (event instanceof HttpResponse) {
        this.importStatus = 'Paramétrage importé avec succès.';
        console.log('File is completely uploaded!');
      }
    }, error => {
      this.importStatus = '';
      this.importError = error?.error?.message
        || 'Le paramétrage n’a pas pu être importé. Vérifiez que le fichier ZIP est une archive de paramétrage valide.';
      console.error('Configuration import failed', error);
    });
  }
}
