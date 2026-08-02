import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HalPage } from 'src/app/models/hal-page';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { ResponseFileInfo } from '../models/response-file-info';
import { UploadFileService } from '../upload-file.service';

@Component({
  selector: 'app-list-upload',
  templateUrl: './list-upload.component.html',
  styleUrls: ['./list-upload.component.scss']
})
export class ListUploadComponent implements OnInit, OnDestroy {
  responseFileInfos: ResponseFileInfo[] = [];
  page = 1;
  pages: HalPage = { size: 0, number: -1, totalElements: 0, totalPages: 1 };

  private readonly SelectedId = 'ListUploadComponent.selected';
  private leasedId?: string;
  private leaseHeartbeat?: ReturnType<typeof setInterval>;

  constructor(
    private uploadService: UploadFileService,
    private dialogService: DialogService) { }

  ngOnDestroy(): void {
    sessionStorage.removeItem(this.SelectedId);
    this.releaseCurrentLease();
    if (this.leaseHeartbeat) {
      clearInterval(this.leaseHeartbeat);
    }
  }

  ngOnInit() {
    this.leaseHeartbeat = setInterval(() => this.renewCurrentLease(), 30000);
    this.loadResponseFileInfos()
      .then(() => { })
      .catch(error => console.error(error));
  }

  async loadResponseFileInfos() {
    this.responseFileInfos = [];
    this.page = 1;
    this.pages = { size: 0, number: -1, totalElements: 0, totalPages: 1 };
    const lastPage = Number(sessionStorage.getItem(this.SelectedId));
    this.page = Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1;
    await this.loadPage(this.page);
  }

  async loadPage(page: number) {
    this.releaseCurrentLease();
    const requestedPage = Math.max(1, page);
    const files = await this.uploadService.getFiles(requestedPage - 1, 1).toPromise();
    this.pages = files.page;
    if (this.pages.totalElements === 0) {
      this.page = 1;
      this.responseFileInfos = [];
      return;
    }
    this.page = Math.min(requestedPage, this.pages.totalElements);
    if (this.page !== requestedPage) {
      return this.loadPage(this.page);
    }
    const available = files._embedded?.responseFileInfoes ?? [];
    if (!available.length) {
      this.responseFileInfos = [];
      return;
    }
    try {
      const claimed = await this.uploadService.claimForVerification(available[0].id).toPromise();
      this.responseFileInfos = claimed ? [claimed] : [];
      this.leasedId = claimed?.id;
    } catch (error) {
      console.warn('Le formulaire vient d\'être réservé par un autre appareil.', error);
      await this.loadResponseFileInfos();
      return;
    }
    sessionStorage.setItem(this.SelectedId, String(this.page));
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' && !this.dialogService.hasOpenDialogs()) {
      this.next();
    }
    if (event.key === 'ArrowLeft' && !this.dialogService.hasOpenDialogs()) {
      this.previous();
    }
  }

  next() {
    if (this.page < this.pages.totalElements) {
      this.page++;
      this.loadPage(this.page);
    }
  }

  previous() {
    if (this.page > 1) {
      this.page--;
      this.loadPage(this.page);
    }
  }

  deletePage(page: number) {
    if (page > 0 && page <= this.pages.totalElements) {
      this.pages.totalElements--;
      if (this.page > this.pages.totalElements)
        this.page--;
      this.loadPage(this.page);
    }
  }

  private renewCurrentLease() {
    if (!this.leasedId) {
      return;
    }
    this.uploadService.renewVerificationLease(this.leasedId).subscribe({
      error: error => {
        console.warn('La réservation du formulaire a expiré.', error);
        this.leasedId = undefined;
        this.loadResponseFileInfos();
      }
    });
  }

  private releaseCurrentLease() {
    const id = this.leasedId;
    this.leasedId = undefined;
    if (id) {
      this.uploadService.releaseVerificationLease(id).subscribe({
        error: error => console.debug('Réservation déjà libérée.', error)
      });
    }
  }
}
