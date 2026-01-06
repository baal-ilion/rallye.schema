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
  uploadedFiles: UploadedFile[] = [];
  selectedNames: string[] = [];

  private static createUploadedFile(file: File): UploadedFile {
    return { file, progress: { percentage: 0 }, status: 'uploading' };
  }

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
    const files = Array.from(this.selectedFiles);
    this.selectedNames = [];
    this.selectedFiles = undefined;
    files.forEach(file => this.uploadFile(file));
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private uploadFile(fileToUpload: File) {
    const uploadedFile = FormUploadComponent.createUploadedFile(fileToUpload);
    this.uploadedFiles.push(uploadedFile);
    this.performUpload(uploadedFile, 0);
  }

  private performUpload(uploadedFile: UploadedFile, attempt: number) {
    this.uploadService.pushFileToStorage(uploadedFile.file).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) {
          uploadedFile.progress.percentage = Math.round(100 * event.loaded / (event.total || 1));
        } else if (event instanceof HttpResponse) {
          uploadedFile.progress.percentage = 100;
          uploadedFile.status = 'done';
        }
      },
      error: err => {
        if (attempt < 2) {
          uploadedFile.progress.percentage = 0;
          this.performUpload(uploadedFile, attempt + 1);
          return;
        }
        uploadedFile.progress.percentage = 100;
        uploadedFile.status = 'error';
        uploadedFile.errorMessage = err?.message || "Echec de l'import";
      }
    });
  }
}

interface UploadedFile {
  file: File;
  progress: { percentage: number };
  status: 'uploading' | 'done' | 'error';
  errorMessage?: string;
}
