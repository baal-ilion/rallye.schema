import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UploadFileService } from '../upload-file.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-form-upload',
  templateUrl: './form-upload.component.html',
  styleUrls: ['./form-upload.component.scss']
})
export class FormUploadComponent implements OnInit {

  @ViewChild('labelImport')
  labelImport: ElementRef;

  selectedFiles: FileList;
  uploadedFiles: { file: File, progress: { percentage: number } }[] = [];

  constructor(private uploadService: UploadFileService) { }

  ngOnInit() {
  }

  selectFile(files: FileList) {
    this.labelImport.nativeElement.innerText = Array.from(files)
      .map(f => f.name)
      .join(', ');
    this.selectedFiles = files;
  }

  upload() {
    this.uploadedFiles = [];
    // tslint:disable-next-line: prefer-for-of
    for (let index = 0; index < this.selectedFiles.length; index++) {
      const file = this.selectedFiles[index];
      this.uploadFile(file);
    }
    this.labelImport.nativeElement.innerText = '<i class="fas fa-search">Choose file</i>';
    this.selectedFiles = undefined;
  }

  uploadFile(fileToUpload) {
    const uploadedFile = { file: fileToUpload, progress: { percentage: 0 } };
    this.uploadedFiles.push(uploadedFile);

    this.uploadService.pushFileToStorage(uploadedFile.file).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        uploadedFile.progress.percentage = Math.round(100 * event.loaded / event.total);
      } else if (event instanceof HttpResponse) {
        console.log('File is completely uploaded!');
      }
    });
  }
}
