import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HalPage } from 'src/app/models/hal-page';
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

  constructor(
    private uploadService: UploadFileService,
    private modalService: NgbModal) { }

  ngOnDestroy(): void {
    sessionStorage.setItem(this.SelectedId, null);
  }

  ngOnInit() {
    this.loadResponseFileInfos()
      .then(() => { })
      .catch(error => console.error(error));
  }

  async loadResponseFileInfos() {
    this.responseFileInfos = [];
    this.page = 1;
    this.pages = { size: 0, number: -1, totalElements: 0, totalPages: 1 };
    // load first page
    await this.loadPages(this.page);
    // load others pages
    await this.loadPages(this.pages.totalElements);
    // select last selected item
    const lastSelected = sessionStorage.getItem(this.SelectedId);
    const index = this.responseFileInfos.findIndex(f => f.id === lastSelected);
    if (index !== -1) {
      this.page = index + 1;
      this.loadPage(this.page);
    }
  }

  async loadPages(page: number) {
    if (page > this.responseFileInfos.length) {
      const pageNumber = this.pages.number + 1;
      if (pageNumber < this.pages.totalPages) {
        const files = await this.uploadService.getFiles(pageNumber, 10).toPromise();
        console.log(files);
        this.pages = files.page;
        console.log(this.pages);
        this.responseFileInfos = this.responseFileInfos.concat(files._embedded?.responseFileInfoes ?? []);
        await this.loadPages(page);
      }
    }
  }

  loadPage(page: number) {
    this.loadPages(page);
    sessionStorage.setItem(this.SelectedId, this.responseFileInfos[page - 1].id);
    this.uploadService.getResource<ResponseFileInfo>(this.responseFileInfos[page - 1]._links.self.href).toPromise()
      .then(r => this.responseFileInfos[page - 1] = r)
      .catch(error => console.error(error));
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' && !this.modalService.hasOpenModals()) {
      this.next();
    }
    if (event.key === 'ArrowLeft' && !this.modalService.hasOpenModals()) {
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
      this.responseFileInfos.splice(page - 1, 1);
      this.pages.totalElements--;
      this.loadPage(page);
      if (this.page > this.pages.totalElements)
        this.page--;
    }
  }
}
