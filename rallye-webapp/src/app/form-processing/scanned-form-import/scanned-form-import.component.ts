import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SubmittedFormService } from '../submitted-form.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-scanned-form-import',
  templateUrl: './scanned-form-import.component.html',
  styleUrls: ['./scanned-form-import.component.scss']
})
export class ScannedFormImportComponent implements OnInit {

  private readonly maxConcurrentUploads = 2;
  private activeUploads = 0;

  @ViewChild('fileInput')
  fileInput: ElementRef<HTMLInputElement>;

  selectedFiles: FileList;
  uploadedFiles: UploadedFile[] = [];
  selectedNames: string[] = [];
  dragging = false;

  constructor(private uploadService: SubmittedFormService) { }

  ngOnInit() {
  }

  selectFile(files: FileList) {
    this.selectedFiles = files;
    if (files && files.length > 0) {
      this.selectedNames = Array.from(files).map(f => f.name);
      this.upload();
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
    uploadedFile.status = 'queued';
    uploadedFile.progress.percentage = 0;
    uploadedFile.errorMessage = undefined;
    this.startNextUploads();
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.dragging = true; }
  onDragLeave(event: DragEvent) { event.preventDefault(); this.dragging = false; }
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging = false;
    if (event.dataTransfer?.files?.length) this.selectFile(event.dataTransfer.files);
  }

  get completedCount(): number { return this.uploadedFiles.filter(file => file.submittedFormId).length; }

  statusLabel(uploadedFile: UploadedFile): string {
    if (uploadedFile.status === 'queued') return 'En attente d’envoi';
    if (uploadedFile.status === 'uploading') return `Envoi ${uploadedFile.progress.percentage} %`;
    if (uploadedFile.status === 'done') return 'Importé';
    return 'Erreur d’import';
  }

  statusIcon(uploadedFile: UploadedFile): string {
    if (uploadedFile.status === 'uploading') return 'fas fa-spinner fa-spin';
    if (uploadedFile.status === 'done') return 'fas fa-check-circle';
    if (uploadedFile.status === 'error') return 'fas fa-exclamation-circle';
    return 'fas fa-clock';
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
    this.uploadService.uploadSubmittedForm(uploadedFile.file, uploadedFile.uploadId).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) {
          uploadedFile.progress.percentage = Math.round(100 * event.loaded / (event.total || 1));
        } else if (event instanceof HttpResponse) {
          uploadedFile.progress.percentage = 100;
          uploadedFile.submittedFormId = (event.body as any)?.id;
          uploadedFile.status = 'done';
          this.uploadFinished();
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

  private markAsError(uploadedFile: UploadedFile, error: any) {
    uploadedFile.progress.percentage = 100;
    uploadedFile.status = 'error';
    uploadedFile.errorMessage = error?.message || "Echec de l'import";
  }
}

interface UploadedFile {
  file: File;
  progress: { percentage: number };
  status: 'queued' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
  submittedFormId?: string;
  uploadId: string;
}
