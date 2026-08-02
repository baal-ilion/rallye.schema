import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UploadFileService } from '../upload-file.service';

type CaptureStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error';

interface CapturedForm {
  id: number;
  file: File;
  previewUrl: string;
  status: CaptureStatus;
  progress: number;
  errorMessage?: string;
  responseFileId?: string;
  uploadId: string;
}

@Component({
  selector: 'app-form-capture',
  templateUrl: './form-capture.component.html',
  styleUrls: ['./form-capture.component.scss']
})
export class FormCaptureComponent implements OnDestroy {

  @ViewChild('cameraVideo')
  cameraVideo: ElementRef<HTMLVideoElement>;

  @ViewChild('cameraInput')
  cameraInput: ElementRef<HTMLInputElement>;

  capturedForms: CapturedForm[] = [];
  cameraActive = false;
  cameraStarting = false;
  cameraError = '';
  private cameraStream?: MediaStream;
  retakingForm?: CapturedForm;
  private nextId = 1;
  private readonly maxConcurrentUploads = 2;
  private activeUploads = 0;

  constructor(private uploadService: UploadFileService, private router: Router) {
  }

  ngOnDestroy() {
    this.stopCamera();
    this.capturedForms.forEach(form => URL.revokeObjectURL(form.previewUrl));
  }

  addDevicePhotos(files: FileList | null) {
    if (files) {
      const photos = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (photos.length && this.retakingForm) {
        this.remove(this.retakingForm);
        this.retakingForm = undefined;
      }
      photos.forEach(file => this.addFile(file));
    }
    if (this.cameraInput) {
      this.cameraInput.nativeElement.value = '';
    }
  }

  async startCapture() {
    this.cameraError = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.openNativeCamera();
      return;
    }
    this.stopCamera();
    this.cameraStarting = true;
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840 },
          height: { ideal: 2160 }
        },
        audio: false
      });
      this.cameraActive = true;
      setTimeout(async () => {
        if (this.cameraVideo) {
          this.cameraVideo.nativeElement.srcObject = this.cameraStream;
          await this.cameraVideo.nativeElement.play();
        }
      });
    } catch {
      this.openNativeCamera();
    } finally {
      this.cameraStarting = false;
    }
  }

  stopCamera() {
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.cameraStream = undefined;
    this.cameraActive = false;
    if (this.cameraVideo) {
      this.cameraVideo.nativeElement.srcObject = null;
    }
  }

  capturePhoto() {
    const video = this.cameraVideo?.nativeElement;
    if (!video || !video.videoWidth || !video.videoHeight) {
      this.cameraError = 'La caméra n’est pas encore prête. Patientez une seconde puis recommencez.';
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        this.cameraError = 'La photographie n’a pas pu être créée.';
        return;
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `formulaire-${timestamp}.jpg`, { type: 'image/jpeg' });
      if (this.retakingForm) {
        const previous = this.retakingForm;
        this.retakingForm = undefined;
        this.remove(previous);
      }
      this.addFile(file);
      this.cameraError = '';
    }, 'image/jpeg', 0.96);
  }

  remove(form: CapturedForm) {
    if (form.status === 'uploading' || form.status === 'processing' || form.status === 'pending') {
      return;
    }
    URL.revokeObjectURL(form.previewUrl);
    this.capturedForms = this.capturedForms.filter(candidate => candidate.id !== form.id);
    if (form.responseFileId) {
      this.uploadService.deleteResponseFile(form.responseFileId).subscribe({
        error: error => console.error('Impossible de supprimer la photographie envoyée.', error)
      });
    }
  }

  async retake(form: CapturedForm) {
    if (form.status === 'uploading' || form.status === 'processing' || form.status === 'pending') {
      return;
    }
    this.retakingForm = form;
    if (!this.cameraActive) {
      await this.startCapture();
    }
  }

  retry(form: CapturedForm) {
    if (form.status !== 'error') {
      return;
    }
    if (form.responseFileId) {
      form.status = 'processing';
      this.uploadService.retryProcessing(form.responseFileId).subscribe({
        next: () => this.waitForProcessing(form),
        error: error => this.markAsError(form, error)
      });
      return;
    }
    form.status = 'pending';
    form.progress = 0;
    form.errorMessage = undefined;
    this.startNextUploads();
  }

  finish() {
    if (!this.canFinish) {
      return;
    }
    this.stopCamera();
    this.router.navigate(['/listUpload']);
  }

  get uploading(): boolean {
    return this.capturedForms.some(form =>
      form.status === 'pending' || form.status === 'uploading' || form.status === 'processing');
  }

  get errorCount(): number {
    return this.capturedForms.filter(form => form.status === 'error').length;
  }

  get readyCount(): number {
    return this.capturedForms.filter(form => form.status === 'done').length;
  }

  get canFinish(): boolean {
    return this.capturedForms.length > 0 && !this.uploading && this.errorCount === 0;
  }

  private addFile(file: File) {
    const form: CapturedForm = {
      id: this.nextId++,
      uploadId: this.uploadService.createUploadId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    };
    this.capturedForms.push(form);
    this.startNextUploads();
  }

  private openNativeCamera() {
    this.cameraInput?.nativeElement.click();
  }

  private startNextUploads() {
    while (this.activeUploads < this.maxConcurrentUploads) {
      const next = this.capturedForms.find(form => form.status === 'pending');
      if (!next) {
        return;
      }
      this.upload(next);
    }
  }

  private upload(form: CapturedForm) {
    form.status = 'uploading';
    form.progress = 0;
    form.errorMessage = undefined;
    this.activeUploads++;
    this.uploadService.pushFileToStorage(form.file, form.uploadId).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) {
          form.progress = Math.round(100 * event.loaded / (event.total || 1));
        } else if (event instanceof HttpResponse) {
          form.progress = 100;
          form.responseFileId = (event.body as any)?.id;
          form.status = 'processing';
          this.waitForProcessing(form);
          this.uploadFinished();
        }
      },
      error: error => {
        form.progress = 100;
        this.markAsError(form, error);
        this.uploadFinished();
        form.errorMessage = error?.message || 'Échec de l’envoi';
      }
    });
  }

  private uploadFinished() {
    this.activeUploads = Math.max(0, this.activeUploads - 1);
    this.startNextUploads();
  }

  private waitForProcessing(form: CapturedForm) {
    this.uploadService.waitForProcessing(form.responseFileId!).subscribe({
      next: info => {
        if (info.processingStatus === 'ERROR') {
          this.markAsError(form, { message: info.processingError });
        } else {
          form.status = 'done';
        }
      },
      error: error => this.markAsError(form, error)
    });
  }

  private markAsError(form: CapturedForm, error: any) {
    form.progress = 100;
    form.status = 'error';
    form.errorMessage = error?.message || 'Échec de lâ€™envoi';
  }
}
