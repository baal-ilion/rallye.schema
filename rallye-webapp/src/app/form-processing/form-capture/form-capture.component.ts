import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { SubmittedFormService } from '../submitted-form.service';

type CaptureStatus = 'pending' | 'uploading' | 'done' | 'error';

interface PendingPhoto {
  file: File;
  previewUrl: string;
}

interface CapturedForm {
  id: number;
  file: File;
  previewUrl: string;
  status: CaptureStatus;
  progress: number;
  errorMessage?: string;
  submittedFormId?: string;
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
  pendingPhoto?: PendingPhoto;
  galleryOpen = false;
  capturing = false;
  private cameraStream?: MediaStream;
  retakingForm?: CapturedForm;
  private nextId = 1;
  private readonly maxConcurrentUploads = 2;
  private activeUploads = 0;

  constructor(private uploadService: SubmittedFormService) {
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.pendingPhoto) URL.revokeObjectURL(this.pendingPhoto.previewUrl);
    this.capturedForms.forEach(form => URL.revokeObjectURL(form.previewUrl));
  }

  addDevicePhotos(files: FileList | null) {
    if (files) {
      const photos = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (photos.length) this.playShutterSound();
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
    if (this.capturing || this.pendingPhoto) return;
    const video = this.cameraVideo?.nativeElement;
    if (!video || !video.videoWidth || !video.videoHeight) {
      this.cameraError = 'La caméra n’est pas encore prête. Patientez une seconde puis recommencez.';
      return;
    }
    this.capturing = true;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    try {
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.playShutterSound();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
      const blob = this.dataUrlToBlob(dataUrl);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `formulaire-${timestamp}.jpg`, { type: 'image/jpeg' });
      if (this.pendingPhoto) URL.revokeObjectURL(this.pendingPhoto.previewUrl);
      this.pendingPhoto = { file, previewUrl: URL.createObjectURL(file) };
      this.cameraError = '';
    } catch {
      this.cameraError = 'La photographie n’a pas pu être créée. Veuillez recommencer.';
    } finally {
      this.capturing = false;
    }
  }

  keepPhoto() {
    if (!this.pendingPhoto) return;
    const file = this.pendingPhoto.file;
    URL.revokeObjectURL(this.pendingPhoto.previewUrl);
    this.pendingPhoto = undefined;
    if (this.retakingForm) {
      const previous = this.retakingForm;
      this.retakingForm = undefined;
      this.remove(previous);
    }
    this.addFile(file);
    this.resumeCameraPreview();
  }

  retakePendingPhoto() {
    if (!this.pendingPhoto) return;
    URL.revokeObjectURL(this.pendingPhoto.previewUrl);
    this.pendingPhoto = undefined;
    this.resumeCameraPreview();
  }

  remove(form: CapturedForm) {
    if (form.status === 'uploading' || form.status === 'pending') {
      return;
    }
    URL.revokeObjectURL(form.previewUrl);
    this.capturedForms = this.capturedForms.filter(candidate => candidate.id !== form.id);
    if (form.submittedFormId) {
      this.uploadService.deleteSubmittedForm(form.submittedFormId).subscribe({
        error: error => console.error('Impossible de supprimer la photographie envoyée.', error)
      });
    }
  }

  async retake(form: CapturedForm) {
    if (form.status === 'uploading' || form.status === 'pending') {
      return;
    }
    this.retakingForm = form;
    this.galleryOpen = false;
    if (!this.cameraActive) {
      await this.startCapture();
    }
  }

  retry(form: CapturedForm) {
    if (form.status !== 'error') {
      return;
    }
    form.status = 'pending';
    form.progress = 0;
    form.errorMessage = undefined;
    this.startNextUploads();
  }

  finish() {
    this.stopCamera();
    if (this.pendingPhoto) URL.revokeObjectURL(this.pendingPhoto.previewUrl);
    this.pendingPhoto = undefined;
    this.capturedForms.forEach(form => URL.revokeObjectURL(form.previewUrl));
    this.capturedForms = [];
    this.retakingForm = undefined;
    this.galleryOpen = false;
    this.cameraError = '';
    this.nextId = 1;
  }

  openGallery() {
    this.galleryOpen = true;
  }

  closeGallery() {
    this.galleryOpen = false;
  }

  get uploading(): boolean {
    return this.capturedForms.some(form =>
      form.status === 'pending' || form.status === 'uploading');
  }

  get sending(): boolean {
    return this.capturedForms.some(form => form.status === 'pending' || form.status === 'uploading');
  }

  get receivedCount(): number {
    return this.capturedForms.filter(form => !!form.submittedFormId).length;
  }

  get errorCount(): number {
    return this.capturedForms.filter(form => form.status === 'error').length;
  }

  get readyCount(): number {
    return this.capturedForms.filter(form => form.status === 'done').length;
  }

  get canFinish(): boolean {
    return this.capturedForms.length > 0 && !this.sending && this.receivedCount > 0;
  }

  isLocked(form: CapturedForm): boolean {
    return form.status === 'uploading' || form.status === 'pending';
  }

  statusLabel(form: CapturedForm): string {
    if (form.status === 'pending') return 'En attente';
    if (form.status === 'uploading') return `Envoi ${form.progress} %`;
    if (form.status === 'done') return 'Envoyée';
    return 'Erreur d’envoi';
  }

  statusIcon(form: CapturedForm): string {
    if (form.status === 'pending') return 'fas fa-clock';
    if (form.status === 'uploading') return 'fas fa-spinner fa-spin';
    if (form.status === 'done') return 'fas fa-check-circle';
    return 'fas fa-exclamation-circle';
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
    this.uploadService.uploadSubmittedForm(form.file, form.uploadId).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) {
          form.progress = Math.round(100 * event.loaded / (event.total || 1));
        } else if (event instanceof HttpResponse) {
          form.progress = 100;
          form.submittedFormId = (event.body as any)?.id;
          form.status = 'done';
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

  private playShutterSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const now = context.currentTime;
      const scheduleMechanicalClick = (start: number, duration: number, frequency: number, volume: number) => {
        const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
        const buffer = context.createBuffer(1, frameCount, context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let index = 0; index < frameCount; index++) {
          const envelope = Math.pow(1 - index / frameCount, 4);
          samples[index] = (Math.random() * 2 - 1) * envelope;
        }
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = frequency;
        filter.Q.value = 0.8;
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        source.start(start);
      };
      scheduleMechanicalClick(now, 0.025, 2400, 0.75);
      scheduleMechanicalClick(now + 0.045, 0.045, 850, 0.6);
      window.setTimeout(() => context.close(), 180);
    } catch {
      // La prise de vue reste disponible si le navigateur interdit le son.
    }
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }

  private resumeCameraPreview() {
    requestAnimationFrame(() => {
      const video = this.cameraVideo?.nativeElement;
      if (!video || !this.cameraStream) return;
      if (video.srcObject !== this.cameraStream) video.srcObject = this.cameraStream;
      video.play().catch(() => undefined);
    });
  }

  private markAsError(form: CapturedForm, error: any) {
    form.progress = 100;
    form.status = 'error';
    form.errorMessage = error?.message || 'Échec de lâ€™envoi';
  }
}
