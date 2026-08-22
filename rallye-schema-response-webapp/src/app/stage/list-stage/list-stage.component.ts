import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { HalPage } from 'src/app/models/hal-page';
import { StageParam } from 'src/app/param/models/stage-param';
import { TeamInfo } from 'src/app/param/models/team-info';
import { StageParamService } from 'src/app/param/stage-param.service';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { StageCriteria } from '../models/stage-criteria';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { sameData } from 'src/app/shared/data-change.utils';

@Component({
  selector: 'app-list-stage',
  templateUrl: './list-stage.component.html',
  styleUrls: ['./list-stage.component.scss']
})
export class ListStageComponent implements OnInit, OnDestroy {
  stages: StageResult[] = [];
  page = 1;
  pages: HalPage = { size: 0, number: -1, totalElements: 0, totalPages: 1 };
  criteria: StageCriteria = { checked: false, entered: true, finished: true, sortBy: ['stage,asc', 'team,asc'] };
  filterMode: 'PENDING' | 'VALIDATED' | 'ALL' | 'CUSTOM' = 'PENDING';
  mobileDetailOpen = false;
  loading = false;
  contentZoomPercent = 100;
  selectedStageHasResponseFiles = false;
  teams: TeamInfo[] = [];
  stageParams: StageParam[] = [];
  private loadedParam = false;
  private destroy$ = new Subject<void>();

  private readonly SelectedId = 'ListStageComponent.selected';
  private readonly CriteriaId = 'ListStageComponent.criteria';
  private readonly ZoomId = 'ListStageComponent.zoom';

  constructor(
    private stageService: StageService,
    private teamInfoService: TeamInfoService,
    private stageParamService: StageParamService,
    private dialogService: DialogService,
    private rankingUpdateService: RankingUpdateService,
    @Inject(DOCUMENT) private document: Document) { }

  ngOnDestroy(): void {
    this.document.documentElement.classList.remove('validation-stage-page');
    this.document.body.classList.remove('validation-stage-page');
    sessionStorage.setItem(this.SelectedId, null);
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackStage(_index: number, stage: StageResult): string {
    return stage.id;
  }

  trackStageParam(_index: number, stage: StageParam): string | number {
    return stage.id ?? stage.stage;
  }

  trackTeam(_index: number, team: TeamInfo): string | number {
    return team.id ?? team.team;
  }

  ngOnInit() {
    this.document.documentElement.classList.add('validation-stage-page');
    this.document.body.classList.add('validation-stage-page');
    this.criteria = this.restoreCriteria();
    this.contentZoomPercent = this.restoreZoom();
    this.criteria.sortBy = ['stage,asc', 'team,asc'];
    this.filterMode = this.detectFilterMode();
    this.loadStages()
      .then(() => { })
      .catch(error => console.error(error));
    this.rankingUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshCurrentPage());
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
    this.loading = true;
    this.stages = [];
    this.page = 1;
    this.pages = { size: 0, number: -1, totalElements: 0, totalPages: 1 };
    // load param
    try {
      await this.loadParam();
      // load first page
      await this.loadPages(this.page);
      // load others pages
      await this.loadPages(this.pages.totalElements);
      this.sortStages();
      // select last selected item
      const lastSelected = sessionStorage.getItem(this.SelectedId);
      const index = this.stages.findIndex(f => f.id === lastSelected);
      if (index !== -1) {
        this.page = index + 1;
        this.loadPage(this.page);
      }
    } finally {
      this.loading = false;
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
        await this.loadPages(page);
      }
    }
  }

  loadPage(page: number) {
    this.selectedStageHasResponseFiles = false;
    this.loadPages(page);
    const selected = this.stages[page - 1];
    if (selected?.id) {
      sessionStorage.setItem(this.SelectedId, selected.id);
    }
  }

  onResponseFilesVisibilityChange(visible: boolean): void {
    this.selectedStageHasResponseFiles = visible;
  }

  zoomOut(): void {
    this.contentZoomPercent = Math.max(20, this.contentZoomPercent - 10);
    this.saveZoom();
  }

  zoomIn(): void {
    this.contentZoomPercent = Math.min(150, this.contentZoomPercent + 10);
    this.saveZoom();
  }

  resetZoom(): void {
    this.contentZoomPercent = 100;
    this.saveZoom();
  }

  get selectedStage(): StageResult | undefined {
    return this.page > 0 ? this.stages[this.page - 1] : undefined;
  }

  get activeFilterLabel(): string {
    switch (this.filterMode) {
      case 'PENDING': return 'À valider';
      case 'VALIDATED': return 'Validées';
      case 'ALL': return 'Toutes les épreuves';
      default: return 'Filtres personnalisés';
    }
  }

  selectStage(index: number): void {
    if (index < 0 || index >= this.stages.length) {
      return;
    }
    this.page = index + 1;
    this.loadPage(this.page);
    this.mobileDetailOpen = true;
  }

  teamLabel(team: number): string {
    return this.teams.find(item => item.team === team)?.name || `Équipe ${team}`;
  }

  stageLabel(stage: number): string {
    return this.stageParams.find(item => item.stage === stage)?.name || `Épreuve ${stage}`;
  }

  applyCustomCriteria(event: Event): void {
    this.filterMode = this.detectFilterMode();
    if (this.filterMode === 'ALL' && (this.criteria.team || this.criteria.stage)) {
      this.filterMode = 'CUSTOM';
    }
    this.changeCriteria(event);
  }

  resetFilters(): void {
    this.criteria = { checked: false, entered: true, finished: true, sortBy: ['stage,asc', 'team,asc'] };
    this.filterMode = 'PENDING';
    this.changeCriteria(null);
  }

  private detectFilterMode(): 'PENDING' | 'VALIDATED' | 'ALL' | 'CUSTOM' {
    const hasEntityFilter = !!this.criteria.team || !!this.criteria.stage;
    if (!hasEntityFilter && this.criteria.checked === false && this.criteria.entered === true && this.criteria.finished === true) {
      return 'PENDING';
    }
    if (!hasEntityFilter && this.criteria.checked === true && this.criteria.entered == null && this.criteria.finished == null) {
      return 'VALIDATED';
    }
    if (!hasEntityFilter && this.criteria.checked == null && this.criteria.entered == null && this.criteria.finished == null) {
      return 'ALL';
    }
    return 'CUSTOM';
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    const element = event.target as HTMLElement;
    if (!this.dialogService.hasOpenDialogs() && element.tagName !== 'INPUT') {
      if (event.key === 'ArrowRight') {
        this.next();
      }
      if (event.key === 'ArrowLeft') {
        this.previous();
      }
    }
  }

  next() {
    if (this.page < this.stages.length) {
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

  changeCriteria(event: Event) {
    console.log(this.criteria);
    this.saveCriteria();
    this.loadStages();
  }

  private restoreCriteria(): StageCriteria {
    const defaultCriteria: StageCriteria = { checked: false, entered: true, finished: true };
    try {
      const storedCriteria = localStorage.getItem(this.CriteriaId);
      return storedCriteria ? { ...defaultCriteria, ...JSON.parse(storedCriteria) } : defaultCriteria;
    } catch (error) {
      console.warn('Impossible de restaurer les filtres de validation.', error);
      return defaultCriteria;
    }
  }

  private saveCriteria(): void {
    try {
      const { stage, team, checked, entered, finished } = this.criteria;
      localStorage.setItem(this.CriteriaId, JSON.stringify({ stage, team, checked, entered, finished }));
    } catch (error) {
      console.warn('Impossible de mémoriser les filtres de validation.', error);
    }
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
      console.warn('Impossible de restaurer le zoom de validation.', error);
      return 100;
    }
  }

  private saveZoom(): void {
    try {
      localStorage.setItem(this.ZoomId, String(this.contentZoomPercent));
    } catch (error) {
      console.warn('Impossible de mémoriser le zoom de validation.', error);
    }
  }

  onStageUpdated() {
    this.loadStages();
  }

  private async refreshCurrentPage(): Promise<void> {
    const currentId = this.stages?.[this.page - 1]?.id || sessionStorage.getItem(this.SelectedId);
    await this.loadParam();
    try {
      const stages = await this.stageService.getStages(this.criteria).toPromise();
      const results = stages._embedded?.stageResults ?? [];
      const nextPages = stages.page ?
        stages.page :
        { size: results.length, number: 0, totalElements: results.length, totalPages: 1 };
      const nextStages = [...results].sort((left, right) => left.stage - right.stage || left.team - right.team);
      if (sameData(this.pages, nextPages) && sameData(this.stages, nextStages)) {
        return;
      }
      this.pages = nextPages;
      this.stages = nextStages;
      const index = currentId ? this.stages.findIndex(s => s.id === currentId) : -1;
      if (index !== -1) {
        this.page = index + 1;
      } else if (this.page > this.stages.length) {
        this.page = this.stages.length > 0 ? this.stages.length : 0;
      }
      if (this.page > 0 && this.stages[this.page - 1]) {
        sessionStorage.setItem(this.SelectedId, this.stages[this.page - 1].id);
      }
    } catch (error) {
      console.log(error);
    }
  }

  private sortStages(): void {
    this.stages.sort((left, right) => left.stage - right.stage || left.team - right.team);
  }
}
