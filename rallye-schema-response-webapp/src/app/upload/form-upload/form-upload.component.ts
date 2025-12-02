import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UploadFileService } from '../upload-file.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-form-upload',
  templateUrl: './form-upload.component.html',
  styleUrls: ['./form-upload.component.scss']
})
export class FormUploadComponent implements OnInit {

  @ViewChild('fileInput')
  fileInput: ElementRef<HTMLInputElement>;

  selectedFiles: FileList;
  uploadedFiles: { file: File, progress: { percentage: number } }[] = [];
  selectedNames: string[] = [];

  constructor(private uploadService: UploadFileService) { }

  ngOnInit() {
  }

  selectFile(files: FileList) {
    this.selectedFiles = files;
    if (files && files.length > 0) {
      this.selectedNames = Array.from(files).map(f => f.name);
    } else {
      this.selectedNames = [];
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
    }
  }

  upload() {
    this.uploadedFiles = [];
    if (!this.selectedFiles || this.selectedFiles.length === 0) {
      this.selectedNames = [];
      return;
    }
    // tslint:disable-next-line: prefer-for-of
    for (let index = 0; index < this.selectedFiles.length; index++) {
      const file = this.selectedFiles[index];
      this.uploadFile(file);
    }
    this.selectedNames = [];
    this.selectedFiles = undefined;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  uploadFile(fileToUpload) {
    const uploadedFile = { file: fileToUpload, progress: { percentage: 0 } };
    this.uploadedFiles.push(uploadedFile);

    this.uploadService.pushFileToStorage(uploadedFile.file).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress) {
        uploadedFile.progress.percentage = Math.round(100 * event.loaded / (event.total || 1));
      } else if (event instanceof HttpResponse) {
        console.log('File is completely uploaded!');
      }
    });
  }
}
