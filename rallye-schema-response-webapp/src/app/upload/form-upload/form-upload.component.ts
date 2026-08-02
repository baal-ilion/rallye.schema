import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UploadFileService } from '../upload-file.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-form-upload',
  templateUrl: './form-upload.component.html',
  styleUrls: ['./form-upload.component.scss']
})
export class FormUploadComponent implements OnInit {

  private readonly maxConcurrentUploads = 2;
  private activeUploads = 0;

  @ViewChild('fileInput')
  fileInput: ElementRef<HTMLInputElement>;

  selectedFiles: FileList;
  uploadedFiles: UploadedFile[] = [];
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
    const files = Array.from(this.selectedFiles);
    this.selectedNames = [];
    this.selectedFiles = undefined;
    files.forEach(file => this.enqueueFile(file));
    this.startNextUploads();
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  retry(uploadedFile: UploadedFile) {
    if (uploadedFile.status !== 'error') {
      return;
    }
    if (uploadedFile.responseFileId) {
      uploadedFile.status = 'processing';
      this.uploadService.retryProcessing(uploadedFile.responseFileId).subscribe({
        next: () => this.waitForProcessing(uploadedFile),
        error: err => this.markAsError(uploadedFile, err)
      });
      return;
    }
    uploadedFile.status = 'queued';
    uploadedFile.progress.percentage = 0;
    uploadedFile.errorMessage = undefined;
    this.startNextUploads();
  }

  private enqueueFile(fileToUpload: File) {
    const uploadedFile: UploadedFile = {
      file: fileToUpload,
      uploadId: this.uploadService.createUploadId(),
      progress: { percentage: 0 },
      status: 'queued'
    };
    this.uploadedFiles.push(uploadedFile);
  }

  private startNextUploads() {
    while (this.activeUploads < this.maxConcurrentUploads) {
      const next = this.uploadedFiles.find(file => file.status === 'queued');
      if (!next) {
        return;
      }
      this.performUpload(next);
    }
  }

  private performUpload(uploadedFile: UploadedFile) {
    uploadedFile.status = 'uploading';
    this.activeUploads++;
    this.uploadService.pushFileToStorage(uploadedFile.file, uploadedFile.uploadId).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) {
          uploadedFile.progress.percentage = Math.round(100 * event.loaded / (event.total || 1));
        } else if (event instanceof HttpResponse) {
          uploadedFile.progress.percentage = 100;
          uploadedFile.responseFileId = (event.body as any)?.id;
          uploadedFile.status = 'processing';
          this.uploadFinished();
          this.waitForProcessing(uploadedFile);
        }
      },
      error: err => {
        this.markAsError(uploadedFile, err);
        this.uploadFinished();
      }
    });
  }

  private uploadFinished() {
    this.activeUploads = Math.max(0, this.activeUploads - 1);
    this.startNextUploads();
  }

  private waitForProcessing(uploadedFile: UploadedFile) {
    this.uploadService.waitForProcessing(uploadedFile.responseFileId!).subscribe({
      next: info => {
        if (info.processingStatus === 'ERROR') {
          this.markAsError(uploadedFile, { message: info.processingError });
        } else {
          uploadedFile.status = 'done';
        }
      },
      error: err => this.markAsError(uploadedFile, err)
    });
  }

  private markAsError(uploadedFile: UploadedFile, error: any) {
    uploadedFile.progress.percentage = 100;
    uploadedFile.status = 'error';
    uploadedFile.errorMessage = error?.message || "Echec de l'import";
  }
}

interface UploadedFile {
  file: File;
  progress: { percentage: number };
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  responseFileId?: string;
  uploadId: string;
}
