import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AppConfigService } from 'src/app/app-config.service';
import { HttpResponse, HttpEventType } from '@angular/common/http';
import { SharingParamService } from '../sharing-param.service';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';

@Component({
  selector: 'app-sharing-param',
  templateUrl: './sharing-param.component.html',
  styleUrls: ['./sharing-param.component.scss']
})
export class SharingParamComponent implements OnInit {
  @ViewChild('importFile')
  importFile: ElementRef;

  exportlink = AppConfigService.settings.apiUrl.rallyeSchema + '/sharing/param';
  uploadedFiles: { file: File, progress: { percentage: number } }[] = [];

  constructor(private sharingParamService: SharingParamService, private confirmationDialogService: ConfirmationDialogService) { }

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

    this.sharingParamService.pushFileToStorage(uploadedFile.file).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        uploadedFile.progress.percentage = Math.round(100 * event.loaded / event.total);
      } else if (event instanceof HttpResponse) {
        console.log('File is completely uploaded!');
      }
    });
  }
}
