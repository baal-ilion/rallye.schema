import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HalPage } from 'src/app/models/hal-page';
import { StageParam } from 'src/app/param/models/stage-param';
import { TeamInfo } from 'src/app/param/models/team-info';
import { StageParamService } from 'src/app/param/stage-param.service';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { StageCriteria } from '../models/stage-criteria';
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
  criteria: StageCriteria = { checked: false, entered: true, finished: true };
  teams: TeamInfo[] = [];
  stageParams: StageParam[] = [];
  private loadedParam = false;

  private readonly SelectedId = 'ListStageComponent.selected';
  private readonly CriteriaId = 'ListStageComponent.criteria';

  constructor(
    private stageService: StageService,
    private teamInfoService: TeamInfoService,
    private stageParamService: StageParamService,
    private modalService: NgbModal) { }

  ngOnDestroy(): void {
    sessionStorage.setItem(this.SelectedId, null);
    sessionStorage.setItem(this.CriteriaId, null);
  }

  ngOnInit() {
    const criteria = sessionStorage.getItem(this.CriteriaId);
    this.criteria = JSON.parse(criteria) as StageCriteria ?? { checked: false, entered: true, finished: true };
    this.loadStages()
      .then(() => { })
      .catch(error => console.error(error));
  }

  async loadParam() {
    if (!this.loadedParam) {
      this.teams = (await this.teamInfoService.getTeamInfos().toPromise())?._embedded?.teamInfoes ?? [];
      this.teams.sort((a, b) => (a.team > b.team) ? 1 : -1);
      this.stageParams = (await this.stageParamService.getStageParams().toPromise())?._embedded?.stageParams ?? [];
      this.stageParams.sort((a, b) => (a.stage > b.stage) ? 1 : -1);
      this.loadedParam = true;
    }
  }

  async loadStages() {
    this.stages = [];
    this.page = 1;
    this.pages = { size: 0, number: -1, totalElements: 0, totalPages: 1 };
    // load param
    await this.loadParam();
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
        const stages = await this.stageService.getStages(this.criteria).toPromise();
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
    const element = event.target as HTMLElement;
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

  nextChecked(checked: boolean) {
    if (checked === false)
      return null;
    return !checked;
  }

  changeCriteria(event) {
    console.log(this.criteria);
    sessionStorage.setItem(this.CriteriaId, JSON.stringify(this.criteria));
    this.loadStages();
  }
}
