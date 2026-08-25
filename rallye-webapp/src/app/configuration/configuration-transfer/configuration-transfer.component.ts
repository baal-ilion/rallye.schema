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
    const uploadedFile = { file: fileToUpload, progress: { percentage: 0 } };
    this.uploadedFiles.push(uploadedFile);

    this.configurationTransferService.importConfigurationArchive(uploadedFile.file).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        uploadedFile.progress.percentage = Math.round(100 * event.loaded / event.total);
      } else if (event instanceof HttpResponse) {
        console.log('File is completely uploaded!');
      }
    });
  }
}
