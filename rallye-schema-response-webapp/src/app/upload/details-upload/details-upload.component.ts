import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Corners } from 'src/app/response-file/common/details-template/models/corners';
import { ResponseFileInfo } from '../models/response-file-info';
import { ModifyUploadComponent } from '../modify-upload/modify-upload.component';
import { UploadFileService } from '../upload-file.service';
import { AppDialogRef, DialogService } from 'src/app/shared/dialog/dialog.service';
import { DetailsResponseFileComponent } from '../details-response-file/details-response-file.component';

@Component({
  selector: 'app-details-upload',
  templateUrl: './details-upload.component.html',
  styleUrls: ['./details-upload.component.scss']
})
export class DetailsUploadComponent implements OnInit, OnChanges, OnDestroy {

  @Input() fileUpload: any;
  @Input() dragable = true;
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() checkedEvent = new EventEmitter<ResponseFileInfo>();
  @ViewChild(DetailsResponseFileComponent) detailsResponseFile?: DetailsResponseFileComponent;
  zoomPercent = 100;
  private readonly ZoomId = 'DetailsUploadComponent.zoom';
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
    private uploadService: UploadFileService,
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
    this.zoomPercent = Math.max(50, this.zoomPercent - 10);
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
      if (!Number.isFinite(storedZoom) || storedZoom < 50 || storedZoom > 150) {
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
    this.uploadService.updateResponseFileInfoCorners({
      id: this.fileUpload.id,
      filledForm: {
        corners: event
      }
    }).subscribe(data => {
      Object.assign(this.fileUpload, data);
      this.detailsResponseFile?.loadTemplate(this.fileUpload);
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
    }, err => {
      console.log(err);
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
    });
  }

  openModifyUpload() {
    const modalRef = this.dialogService.open<ModifyUploadComponent>(ModifyUploadComponent);
    modalRef.componentInstance.fileUpload = this.fileUpload;
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) {
        return;
      }
      this.uploadService.updateResponseFileInfoCorners({
        id: this.fileUpload.id,
        stage: (result as any).stage,
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

  check(event: ResponseFileInfo) {
    this.checkedEvent.emit(event);
    this.ngOnInit();
  }

  delete(event: string) {
    this.deleteEvent.emit(event);
    this.fileUpload = null;
    this.ngOnInit();
  }
}
