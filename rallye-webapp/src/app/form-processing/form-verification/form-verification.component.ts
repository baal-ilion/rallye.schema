import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Corners } from 'src/app/form-recognition/common/details-template/models/corners';
import { SubmittedFormMetadata } from '../models/submitted-form-metadata';
import { FormIdentificationEditorComponent } from '../form-identification-editor/form-identification-editor.component';
import { SubmittedFormService } from '../submitted-form.service';
import { AppDialogRef, DialogService } from 'src/app/shared/dialog/dialog.service';
import { DetailsSubmittedFormComponent } from '../details-submitted-form/details-submitted-form.component';

@Component({
  selector: 'app-form-verification',
  templateUrl: './form-verification.component.html',
  styleUrls: ['./form-verification.component.scss']
})
export class FormVerificationComponent implements OnInit, OnChanges, OnDestroy {

  @Input() fileUpload: any;
  @Input() dragable = true;
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() checkedEvent = new EventEmitter<SubmittedFormMetadata>();
  @ViewChild(DetailsSubmittedFormComponent) detailsSubmittedForm?: DetailsSubmittedFormComponent;
  zoomPercent = 100;
  private readonly ZoomId = 'FormVerificationComponent.zoom';
  private zoomContentElement?: HTMLElement;
  private zoomViewportElement?: HTMLElement;
  private zoomResizeObserver?: ResizeObserver;
  private zoomFrame?: number;

  @ViewChild('zoomContent')
  set zoomContent(element: ElementRef<HTMLElement> | undefined) {
    this.zoomContentElement = element?.nativeElement;
    this.observeZoomContent();
  }

  @ViewChild('zoomViewport')
  set zoomViewport(element: ElementRef<HTMLElement> | undefined) {
    this.zoomViewportElement = element?.nativeElement;
    this.observeZoomContent();
  }

  constructor(
    private uploadService: SubmittedFormService,
    private dialogService: DialogService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.fileUpload.isFirstChange()) {
    }
  }

  ngOnInit() {
    this.zoomPercent = this.restoreZoom();
    this.scheduleZoomViewportUpdate();
  }

  ngOnDestroy(): void {
    this.zoomResizeObserver?.disconnect();
    if (this.zoomFrame !== undefined) {
      cancelAnimationFrame(this.zoomFrame);
    }
  }

  zoomOut(): void {
    this.zoomPercent = Math.max(20, this.zoomPercent - 10);
    this.saveZoom();
    this.scheduleZoomViewportUpdate();
  }

  zoomIn(): void {
    this.zoomPercent = Math.min(150, this.zoomPercent + 10);
    this.saveZoom();
    this.scheduleZoomViewportUpdate();
  }

  resetZoom(): void {
    this.zoomPercent = 100;
    this.saveZoom();
    this.scheduleZoomViewportUpdate();
  }

  private observeZoomContent(): void {
    this.zoomResizeObserver?.disconnect();
    if (!this.zoomContentElement || !this.zoomViewportElement) {
      return;
    }
    this.zoomResizeObserver = new ResizeObserver(() => this.scheduleZoomViewportUpdate());
    this.zoomResizeObserver.observe(this.zoomContentElement);
    this.scheduleZoomViewportUpdate();
  }

  private scheduleZoomViewportUpdate(): void {
    if (this.zoomFrame !== undefined) {
      cancelAnimationFrame(this.zoomFrame);
    }
    this.zoomFrame = requestAnimationFrame(() => {
      this.zoomFrame = undefined;
      if (!this.zoomContentElement || !this.zoomViewportElement) {
        return;
      }
      const naturalHeight = Math.max(this.zoomContentElement.scrollHeight, this.zoomContentElement.offsetHeight);
      this.zoomViewportElement.style.height = `${naturalHeight * this.zoomPercent / 100}px`;
    });
  }

  private restoreZoom(): number {
    try {
      const storedValue = localStorage.getItem(this.ZoomId);
      if (storedValue === null) {
        return 100;
      }
      const storedZoom = Number(storedValue);
      if (!Number.isFinite(storedZoom) || storedZoom < 20 || storedZoom > 150) {
        return 100;
      }
      return Math.round(storedZoom / 10) * 10;
    } catch (error) {
      console.warn('Impossible de restaurer le zoom de vérification.', error);
      return 100;
    }
  }

  private saveZoom(): void {
    try {
      localStorage.setItem(this.ZoomId, String(this.zoomPercent));
    } catch (error) {
      console.warn('Impossible de mémoriser le zoom de vérification.', error);
    }
  }

  endDrag(event: Corners) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    this.uploadService.updateSubmittedFormMetadataCorners({
      id: this.fileUpload.id,
      filledForm: {
        corners: event
      }
    }).subscribe(data => {
      Object.assign(this.fileUpload, data);
      this.detailsSubmittedForm?.loadTemplate(this.fileUpload);
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
    }, err => {
      console.log(err);
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
    });
  }

  openModifyUpload() {
    const modalRef = this.dialogService.open<FormIdentificationEditorComponent>(FormIdentificationEditorComponent);
    modalRef.componentInstance.fileUpload = this.fileUpload;
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) {
        return;
      }
      this.uploadService.updateSubmittedFormMetadataCorners({
        id: this.fileUpload.id,
        challenge: (result as any).challenge,
        page: (result as any).page,
        team: (result as any).team
      }).subscribe(data => {
        this.fileUpload = data;
        this.ngOnInit();
      }, err => {
        console.log(err);
        this.ngOnInit();
      });
    }).catch((error) => {
      console.log(error);
    });
  }

  check(event: SubmittedFormMetadata) {
    this.checkedEvent.emit(event);
    this.ngOnInit();
  }

  delete(event: string) {
    this.deleteEvent.emit(event);
    this.fileUpload = null;
    this.ngOnInit();
  }
}
