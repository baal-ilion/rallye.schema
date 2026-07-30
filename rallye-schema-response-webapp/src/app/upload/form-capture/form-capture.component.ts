import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { UploadFileService } from '../upload-file.service';

type CaptureStatus = 'pending' | 'uploading' | 'done' | 'error';

interface CapturedForm {
  id: number;
  file: File;
  previewUrl: string;
  status: CaptureStatus;
  progress: number;
  errorMessage?: string;
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
  private nextId = 1;

  constructor(private uploadService: UploadFileService) {
  }

  ngOnDestroy() {
    this.stopCamera();
    this.capturedForms.forEach(form => URL.revokeObjectURL(form.previewUrl));
  }

  addDevicePhotos(files: FileList | null) {
    if (files) {
      Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .forEach(file => this.addFile(file));
    }
    if (this.cameraInput) {
      this.cameraInput.nativeElement.value = '';
    }
  }

  async startCamera() {
    this.cameraError = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError = 'Cette caméra ne peut pas être ouverte depuis ce navigateur. Utilisez le bouton « Appareil photo du téléphone ».';
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
      this.cameraError = 'La caméra n’a pas pu être ouverte. Vérifiez son autorisation dans le navigateur.';
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
      this.addFile(new File([blob], `formulaire-${timestamp}.jpg`, { type: 'image/jpeg' }));
      this.cameraError = '';
    }, 'image/jpeg', 0.96);
  }

  remove(form: CapturedForm) {
    if (form.status === 'uploading') {
      return;
    }
    URL.revokeObjectURL(form.previewUrl);
    this.capturedForms = this.capturedForms.filter(candidate => candidate.id !== form.id);
  }

  uploadAll() {
    this.capturedForms
      .filter(form => form.status === 'pending' || form.status === 'error')
      .forEach(form => this.upload(form, 0));
  }

  get pendingCount(): number {
    return this.capturedForms.filter(form => form.status === 'pending' || form.status === 'error').length;
  }

  get uploading(): boolean {
    return this.capturedForms.some(form => form.status === 'uploading');
  }

  private addFile(file: File) {
    this.capturedForms.push({
      id: this.nextId++,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    });
  }

  private upload(form: CapturedForm, attempt: number) {
    form.status = 'uploading';
    form.progress = 0;
    form.errorMessage = undefined;
    this.uploadService.pushFileToStorage(form.file).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) {
          form.progress = Math.round(100 * event.loaded / (event.total || 1));
        } else if (event instanceof HttpResponse) {
          form.progress = 100;
          form.status = 'done';
        }
      },
      error: error => {
        if (attempt < 2) {
          this.upload(form, attempt + 1);
          return;
        }
        form.progress = 100;
        form.status = 'error';
        form.errorMessage = error?.message || 'Échec de l’envoi';
      }
    });
  }
}
