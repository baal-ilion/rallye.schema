import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HalPage } from 'src/app/models/hal-page';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';

@Component({
  selector: 'app-list-stage',
  templateUrl: './list-stage.component.html',
  styleUrls: ['./list-stage.component.scss']
})
export class ListStageComponent implements OnInit, OnDestroy {
  stages: StageResult[] = [];
  page = 1;
  pages: HalPage = { size: 0, number: -1, totalElements: 0, totalPages: 1 };

  private readonly SelectedId = 'ListStageComponent.selected';

  constructor(
    private stageService: StageService,
    private modalService: NgbModal) { }

  ngOnDestroy(): void {
    sessionStorage.setItem(this.SelectedId, null);
  }

  ngOnInit() {
    this.loadStages()
      .then(() => { })
      .catch(error => console.error(error));
  }

  async loadStages() {
    this.stages = [];
    this.page = 1;
    this.pages = { size: 0, number: -1, totalElements: 0, totalPages: 1 };
    // load first page
    await this.loadPages(this.page);
    // load others pages
    await this.loadPages(this.pages.totalElements);
    // select last selected item
    const lastSelected = sessionStorage.getItem(this.SelectedId);
    const index = this.stages.findIndex(f => f.id === lastSelected);
    if (index !== -1) {
      this.page = index + 1;
      this.loadPage(this.page);
    }
  }

  async loadPages(page: number) {
    if (page > this.stages.length) {
      const pageNumber = this.pages.number + 1;
      if (pageNumber < this.pages.totalPages) {
        const stages = await this.stageService.getStages(/*pageNumber, 10*/).toPromise();
        console.log(stages);
        this.pages = stages.page ?
          stages.page :
          { size: 0, number: 0, totalElements: stages._embedded?.stageResults?.length ?? 0, totalPages: 1 };
        console.log(this.pages);
        this.stages = this.stages.concat(stages._embedded?.stageResults ?? []);
        this.loadPages(page);
      }
    }
  }

  loadPage(page: number) {
    this.loadPages(page);
    sessionStorage.setItem(this.SelectedId, this.stages[page - 1].id);
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    console.log(event);
    const element = event.target as HTMLElement;
    console.log(element);
    console.log(element.tagName);
    if (!this.modalService.hasOpenModals() && element.tagName !== 'INPUT') {
      if (event.key === 'ArrowRight') {
        this.next();
      }
      if (event.key === 'ArrowLeft') {
        this.previous();
      }
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
    if (page > 0 && page < this.pages.totalElements) {
      this.stages.splice(page - 1, 1);
      this.pages.totalElements--;
      this.loadPage(page);
    }
  }
}
