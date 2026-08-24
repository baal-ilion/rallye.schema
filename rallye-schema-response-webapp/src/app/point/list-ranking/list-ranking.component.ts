import { KeyValue } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, merge, of, Subject } from 'rxjs';
import { auditTime, catchError, filter, finalize, switchMap, takeUntil, tap, startWith, map } from 'rxjs/operators';
import { StageParam } from '../../param/models/stage-param';
import { TeamInfo } from '../../param/models/team-info';
import { StageParamService } from '../../param/stage-param.service';
import { TeamInfoService } from '../../param/team-info.service';
import { Ranking } from '../models/ranking';
import { TeamPoint } from '../models/team-point';
import { PointService } from '../point.service';
import { RankingUpdateService } from '../../services/ranking-update.service';
import { FullscreenPresentationService } from '../../services/fullscreen-presentation.service';
import { StageService } from '../../stage/stage.service';
import { StageResult } from '../../stage/models/stage-result';
import { TeamInfoUpdateService } from '../../services/team-info-update.service';
import { ApplicationUpdateService } from '../../services/application-update.service';
import { sameData } from '../../shared/data-change.utils';
import { RankingPresentationPanel, RankingPresentationSlide } from '../models/ranking-presentation-slide';

@Component({
  selector: 'app-list-ranking',
  templateUrl: './list-ranking.component.html',
  styleUrls: ['./list-ranking.component.scss']
})
export class ListRankingComponent implements OnInit, OnDestroy {
  generalRanking: Ranking[] = [];
  stageRanking: { [stage: number]: Ranking[] } = {};
  teamInfos: { [team: number]: TeamInfo } = {};
  stageParams: { [stage: number]: StageParam } = {};
  @ViewChild('scrollContainer', { static: true }) scrollContainer?: ElementRef<HTMLElement>;
  viewPoints = localStorage.getItem('ranking-view-points') === 'true';
  presentationMode = false;
  presentationSlides: RankingPresentationSlide[] = [];
  printPanels: RankingPresentationPanel[] = [];
  printPages: RankingPresentationPanel[][] = [];
  presentationSlideIndex = 0;
  presentationFontSize = '20px';
  presentationNameColumnWidth = '30ch';
  presentationColumnWidth = '100%';
  isStageMode = false;
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();
  private initialLoad = true;
  private presentationTimer: ReturnType<typeof setTimeout> | null = null;
  private presentationLayoutTimer: ReturnType<typeof setTimeout> | null = null;
  private presentationMeasurementTimer: ReturnType<typeof setTimeout> | null = null;
  private presentationMetricsSignature = '';
  stagePerformanceValues: { [stage: number]: { name: string, values: { [team: number]: number | null } } } = {};

  keyOrder = (a: KeyValue<string, Ranking[]>, b: KeyValue<string, Ranking[]>): number => {
    const ak = parseInt(a.key, 10);
    const bk = parseInt(b.key, 10);
    return ak > bk ? 1 : (bk > ak ? -1 : 0);
  };

  trackRankingTable(_index: number, item: KeyValue<string, Ranking[]>): string {
    return item.key;
  }

  trackPrintPanel(index: number, panel: RankingPresentationPanel): string {
    return `${panel.title}-${index}`;
  }

  constructor(
    private route: ActivatedRoute,
    private pointService: PointService,
    private teamInfoService: TeamInfoService,
    private stageParamService: StageParamService,
    private rankingUpdateService: RankingUpdateService,
    private teamInfoUpdateService: TeamInfoUpdateService,
    private applicationUpdates: ApplicationUpdateService,
    private fullscreenPresentation: FullscreenPresentationService,
    private stageService: StageService
  ) { }

  ngOnInit() {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    window.addEventListener('resize', this.onPresentationViewportChange);
    window.visualViewport?.addEventListener('resize', this.onPresentationViewportChange);
    merge(
      this.route.queryParamMap.pipe(
        tap(params => {
          const newMode = params.get('mode') === 'stage';
          this.isStageMode = newMode;
          if (!newMode) {
            this.stageParams = {};
            this.stageRanking = {};
          }
        })
      ),
      this.rankingUpdateService.updates$,
      this.teamInfoUpdateService.updates$,
      this.applicationUpdates.updates$.pipe(filter(update =>
        update.domain === 'CONFIGURATION' || update.domain === 'DATABASE' || update.domain === 'RESYNC'))
    )
      .pipe(
        startWith(null),
        auditTime(200),
        tap(() => {
          if (this.initialLoad) {
            this.loading = true;
            this.error = null;
          }
        }),
        switchMap(() => this.refreshData()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    window.removeEventListener('resize', this.onPresentationViewportChange);
    window.visualViewport?.removeEventListener('resize', this.onPresentationViewportChange);
    this.stopPresentationRotation();
    if (this.presentationLayoutTimer) {
      clearTimeout(this.presentationLayoutTimer);
    }
    if (this.presentationMeasurementTimer) {
      clearTimeout(this.presentationMeasurementTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  async enterPresentationMode(): Promise<void> {
    const target = this.scrollContainer?.nativeElement;
    if (!target) {
      return;
    }
    this.buildPresentationSlides();
    try {
      await this.fullscreenPresentation.enter(target);
    } catch (error) {
      console.error('Le mode plein écran n’a pas pu être activé.', error);
    }
  }

  async exitPresentationMode(): Promise<void> {
    await this.fullscreenPresentation.exit();
  }

  private readonly onFullscreenChange = (): void => {
    this.presentationMode = this.fullscreenPresentation.isActiveFor(this.scrollContainer?.nativeElement);
    if (this.presentationMode) {
      this.buildPresentationSlides();
      this.startPresentationRotation();
    } else {
      this.stopPresentationRotation();
    }
  };

  toggleViewPoints(): void {
    this.viewPoints = !this.viewPoints;
    localStorage.setItem('ranking-view-points', String(this.viewPoints));
    if (this.presentationMode) {
      this.buildPresentationSlides();
    }
  }

  private readonly onPresentationViewportChange = (): void => {
    if (!this.presentationMode) {
      return;
    }
    if (this.presentationLayoutTimer) {
      clearTimeout(this.presentationLayoutTimer);
    }
    this.presentationLayoutTimer = setTimeout(() => {
      this.presentationLayoutTimer = null;
      this.buildPresentationSlides();
      this.stopPresentationRotation();
      this.scheduleNextPresentationSlide();
    }, 180);
  };

  private buildPresentationSlides(): void {
    const fontSize = this.presentationFontSizePx();
    this.presentationFontSize = `${fontSize}px`;
    const panels: RankingPresentationPanel[] = [];
    if (!this.isStageMode) {
      this.appendRankingPanel(panels, 'Classement général', this.generalRanking);
    } else {
      Object.keys(this.stageRanking)
        .map(Number)
        .sort((left, right) => left - right)
        .forEach(stage => this.appendRankingPanel(
          panels,
          this.stageParams[stage]?.name || `Épreuve ${stage}`,
          this.stageRanking[stage],
          this.singlePerformanceLabel(stage),
          this.singlePerformanceValues(stage)));
    }

    this.updatePrintLayout(panels);

    const nameCharacters = this.presentationNameCharacters(panels);
    this.presentationNameColumnWidth = `${nameCharacters}ch`;
    const panelsPerSlide = this.presentationPanelsPerSlide(nameCharacters);
    this.presentationColumnWidth = panelsPerSlide > 1
      ? `calc((100% - ${(panelsPerSlide - 1) * 1.25}rem) / ${panelsPerSlide})`
      : '100%';
    const metrics = this.measurePresentationMetrics() || this.fallbackPresentationMetrics(fontSize);
    this.presentationMetricsSignature = this.metricsSignature(metrics);
    const slides = this.packPresentationPanels(panels, panelsPerSlide, metrics);
    const previousSlideCount = this.presentationSlides.length;
    this.presentationSlides = slides;
    this.presentationSlideIndex = Math.min(this.presentationSlideIndex, Math.max(0, slides.length - 1));
    this.schedulePresentationMeasurement();
    if (this.presentationMode) {
      if (slides.length <= 1) {
        this.stopPresentationRotation();
      } else if (slides.length > previousSlideCount) {
        this.stopPresentationRotation();
        this.scheduleNextPresentationSlide();
      } else if (!this.presentationTimer) {
        this.scheduleNextPresentationSlide();
      }
    }
  }

  private appendRankingPanel(panels: RankingPresentationPanel[], title: string, ranking: Ranking[],
      performanceLabel: string | null = null,
      performanceValues: { [team: number]: number | null } | null = null): void {
    panels.push({
      title,
      ranking,
      performanceLabel,
      performanceValues
    });
  }

  private buildPrintPanels(panels: RankingPresentationPanel[]): RankingPresentationPanel[] {
    // La première feuille contient aussi le bandeau de page. Dix-sept lignes
    // garantissent donc qu'une partie reste solidaire sur toutes les feuilles,
    // sans qu'une dernière ligne précède seule le bandeau de la partie suivante.
    const rowsPerPart = 17;
    return panels.reduce((parts, panel) => {
      const partCount = Math.max(1, Math.ceil(panel.ranking.length / rowsPerPart));
      for (let part = 0; part < partCount; part++) {
        parts.push({
          ...panel,
          title: partCount > 1 ? `${panel.title} · ${part + 1}/${partCount}` : panel.title,
          ranking: panel.ranking.slice(part * rowsPerPart, (part + 1) * rowsPerPart)
        });
      }
      return parts;
    }, [] as RankingPresentationPanel[]);
  }

  private buildPrintPages(panels: RankingPresentationPanel[]): RankingPresentationPanel[][] {
    // Une page papier peut contenir au maximum l'équivalent de 19 lignes :
    // deux lignes sont réservées au titre et à l'en-tête de chaque tableau.
    // La pagination est explicite afin que Chrome ne fragmente jamais un panneau.
    const pageCapacity = 19;
    const pages: RankingPresentationPanel[][] = [];
    let page: RankingPresentationPanel[] = [];
    let occupied = 0;

    panels.forEach(panel => {
      const height = panel.ranking.length + 2;
      if (page.length && occupied + height > pageCapacity) {
        pages.push(page);
        page = [];
        occupied = 0;
      }
      page.push(panel);
      occupied += height;
    });
    if (page.length) {
      pages.push(page);
    }
    return pages;
  }

  private updatePrintLayout(panels: RankingPresentationPanel[]): void {
    this.printPanels = this.buildPrintPanels(panels);
    this.printPages = this.buildPrintPages(this.printPanels);
  }

  private updatePrintPanels(): void {
    const panels: RankingPresentationPanel[] = [];
    if (!this.isStageMode) {
      this.appendRankingPanel(panels, 'Classement général', this.generalRanking);
    } else {
      Object.keys(this.stageRanking)
        .map(Number)
        .sort((left, right) => left - right)
        .forEach(stage => this.appendRankingPanel(
          panels,
          this.stageParams[stage]?.name || `Épreuve ${stage}`,
          this.stageRanking[stage],
          this.singlePerformanceLabel(stage),
          this.singlePerformanceValues(stage)));
    }
    this.updatePrintLayout(panels);
  }

  private presentationFontSizePx(): number {
    if (this.viewportWidth() >= 2500 && this.viewportHeight() >= 1300) {
      return 26;
    }
    if (this.viewportWidth() >= 1800 && this.viewportHeight() >= 950) {
      return 24;
    }
    if (this.viewportWidth() >= 1300 && this.viewportHeight() >= 720) {
      return 22;
    }
    return 20;
  }

  private presentationPanelsPerSlide(nameCharacters: number): number {
    const availableWidth = Math.max(0, this.viewportWidth() - 64);
    const columnGap = 20;
    const minimumPanelWidth = this.presentationFontSizePx() * (17.5 + nameCharacters * .55);
    return Math.max(1, Math.min(4,
      Math.floor((availableWidth + columnGap) / (minimumPanelWidth + columnGap))));
  }

  private presentationNameCharacters(panels: RankingPresentationPanel[]): number {
    const longestName = panels.reduce((maximum, panel) => panel.ranking.reduce((panelMaximum, ranking) =>
      Math.max(panelMaximum, (this.teamInfos[ranking.team]?.name || '').length), maximum), 0);
    return Math.max(12, Math.min(30, longestName));
  }

  private packPresentationPanels(panels: RankingPresentationPanel[], columnsPerSlide: number,
      metrics: { availableHeight: number; rowHeight: number; headerHeight: number; gap: number }): RankingPresentationSlide[] {
    const slides: RankingPresentationSlide[] = [];
    let columns: RankingPresentationPanel[][] = Array.from({ length: columnsPerSlide }, () => []);
    let usedHeights = Array.from({ length: columnsPerSlide }, () => 0);
    let columnIndex = 0;

    const flush = (): void => {
      const populatedColumns = columns.filter(column => column.length > 0);
      if (populatedColumns.length) {
        slides.push({ columns: populatedColumns });
      }
      columns = Array.from({ length: columnsPerSlide }, () => []);
      usedHeights = Array.from({ length: columnsPerSlide }, () => 0);
      columnIndex = 0;
    };

    const nextColumn = (): void => {
      columnIndex++;
      if (columnIndex >= columnsPerSlide) {
        flush();
      }
    };

    const addPanel = (panel: RankingPresentationPanel): void => {
      usedHeights[columnIndex] += metrics.headerHeight + panel.ranking.length * metrics.rowHeight
        + (columns[columnIndex].length ? metrics.gap : 0);
      columns[columnIndex].push(panel);
    };

    panels.forEach(panel => {
      const fullHeight = metrics.headerHeight + panel.ranking.length * metrics.rowHeight;
      const remainingHeight = metrics.availableHeight - usedHeights[columnIndex]
        - (columns[columnIndex].length ? metrics.gap : 0);
      if (fullHeight <= remainingHeight) {
        addPanel(panel);
        return;
      }
      if (fullHeight <= metrics.availableHeight) {
        nextColumn();
        addPanel(panel);
        return;
      }

      if (usedHeights[columnIndex] > 0) {
        nextColumn();
      }
      const rowsPerColumn = Math.max(1,
        Math.floor((metrics.availableHeight - metrics.headerHeight) / metrics.rowHeight));
      const partCount = Math.ceil(panel.ranking.length / rowsPerColumn);
      for (let part = 0; part < partCount; part++) {
        addPanel({
          ...panel,
          title: `${panel.title} · ${part + 1}/${partCount}`,
          ranking: panel.ranking.slice(part * rowsPerColumn, (part + 1) * rowsPerColumn)
        });
        if (part < partCount - 1) {
          nextColumn();
        }
      }
    });
    flush();
    return slides;
  }

  private measurePresentationMetrics(): { availableHeight: number; rowHeight: number; headerHeight: number; gap: number } | null {
    const root = this.scrollContainer?.nativeElement;
    const slide = root?.querySelector<HTMLElement>('.presentation-slide');
    const panel = slide?.querySelector<HTMLElement>('app-ranking');
    const rows = Array.from(panel?.querySelectorAll<HTMLElement>('tbody tr') || []);
    if (!slide || !panel || !rows.length || slide.clientHeight <= 0) {
      return null;
    }
    const rowsHeight = rows.reduce((total, row) => total + row.getBoundingClientRect().height, 0);
    const rowHeight = rowsHeight / rows.length;
    const headerHeight = Math.max(1, panel.getBoundingClientRect().height - rowsHeight);
    const column = slide.querySelector<HTMLElement>('.presentation-column');
    const gap = column ? parseFloat(getComputedStyle(column).rowGap || '0') || 0 : 0;
    return { availableHeight: slide.clientHeight, rowHeight, headerHeight, gap };
  }

  private fallbackPresentationMetrics(fontSize: number): {
      availableHeight: number; rowHeight: number; headerHeight: number; gap: number } {
    const rowHeight = fontSize * 1.5 + 10;
    return {
      availableHeight: Math.max(rowHeight * 6, this.viewportHeight() - 120),
      rowHeight,
      headerHeight: rowHeight * 2,
      gap: 8
    };
  }

  private metricsSignature(metrics: { availableHeight: number; rowHeight: number; headerHeight: number; gap: number }): string {
    return [metrics.availableHeight, metrics.rowHeight, metrics.headerHeight, metrics.gap]
      .map(value => Math.round(value * 10) / 10).join('|');
  }

  private schedulePresentationMeasurement(): void {
    if (!this.presentationMode) {
      return;
    }
    if (this.presentationMeasurementTimer) {
      clearTimeout(this.presentationMeasurementTimer);
    }
    this.presentationMeasurementTimer = setTimeout(() => {
      this.presentationMeasurementTimer = null;
      const measured = this.measurePresentationMetrics();
      if (measured && this.metricsSignature(measured) !== this.presentationMetricsSignature) {
        this.buildPresentationSlides();
      }
    }, 80);
  }

  private viewportWidth(): number {
    return window.visualViewport?.width || window.innerWidth;
  }

  private viewportHeight(): number {
    return window.visualViewport?.height || window.innerHeight;
  }

  private startPresentationRotation(): void {
    this.stopPresentationRotation();
    this.presentationSlideIndex = 0;
    this.scheduleNextPresentationSlide();
  }

  private scheduleNextPresentationSlide(): void {
    if (this.presentationSlides.length <= 1 || !this.presentationMode) {
      return;
    }
    const slide = this.presentationSlides[this.presentationSlideIndex];
    this.presentationTimer = setTimeout(() => {
      this.presentationSlideIndex = (this.presentationSlideIndex + 1) % this.presentationSlides.length;
      this.scheduleNextPresentationSlide();
    }, this.presentationDurationMs(slide));
  }

  private presentationDurationMs(slide: RankingPresentationSlide): number {
    const panels = slide.columns.reduce((all, column) => all.concat(column), [] as RankingPresentationPanel[]);
    const mostPopulatedColumn = Math.max(...slide.columns.map(column =>
      column.reduce((total, panel) => total + panel.ranking.length, 0)), 0);
    const seconds = 7 + mostPopulatedColumn * 0.65 + Math.max(0, panels.length - 1) * 2;
    return Math.round(Math.max(10000, Math.min(26000, seconds * 1000)));
  }

  private stopPresentationRotation(): void {
    if (this.presentationTimer) {
      clearTimeout(this.presentationTimer);
      this.presentationTimer = null;
    }
  }

  private FillRanking(teamPoints: TeamPoint[], ranking: Ranking[]) {
    let teamRank: Ranking;
    let index = 1;
    for (const teamPoint of teamPoints.sort((left, right) => {
      if (left.total < right.total) { return 1; }
      if (left.total > right.total) { return -1; }
      if (left.team < right.team) { return 1; }
      if (left.team > right.team) { return -1; }
      return 0;
    })) {
      if (teamRank?.total === teamPoint.total) {
        teamRank = { order: '-', team: teamPoint.team, total: teamPoint.total };
      } else {
        teamRank = { order: index.toString(), team: teamPoint.team, total: teamPoint.total };
      }
      ranking.push(teamRank);
      index += 1;
    }
  }

  private BuildStagePoints(teamPoints: TeamPoint[]): { [stage: number]: TeamPoint[] } {
    const stagePointsByStage: { [stage: number]: TeamPoint[] } = {};
    for (const teamPoint of teamPoints) {
      for (const [stageKey, stagePoint] of Object.entries(teamPoint.stagePoints || {})) {
        const stage = parseInt(stageKey, 10);
        const teamStagePoint: TeamPoint = { team: teamPoint.team, total: stagePoint.total, stagePoints: null };
        if (!stagePointsByStage[stage]) {
          stagePointsByStage[stage] = [teamStagePoint];
        } else {
          stagePointsByStage[stage].push(teamStagePoint);
        }
      }
    }
    return stagePointsByStage;
  }

  private refreshData() {
    return this.loadStaticData().pipe(
      switchMap(() => this.refreshPoints()),
      catchError(() => {
        this.error = 'Erreur lors du chargement du classement';
        return of();
      }),
      finalize(() => {
        this.loading = false;
        this.initialLoad = false;
      })
    );
  }

  private loadStaticData() {
    const needTeams = Object.keys(this.teamInfos).length === 0;
    const needStageParams = this.isStageMode && Object.keys(this.stageParams).length === 0;

    const teamInfos$ = needTeams ? this.teamInfoService.getTeamInfos() : of(null);
    const stageParams$ = needStageParams ? this.stageParamService.getStageParams() : of(null);

    return forkJoin([teamInfos$, stageParams$]).pipe(
      tap(([teamInfosResponse, stageParamsResponse]) => {
        if (teamInfosResponse) {
          const embeddedTeams: any = teamInfosResponse?._embedded || {};
          const teams = embeddedTeams.teamInfoes || embeddedTeams.teamInfos || [];
          teams.forEach((teamInfo: TeamInfo) => {
            this.teamInfos[teamInfo.team] = teamInfo;
          });
        }

        if (stageParamsResponse) {
          const embeddedStage: any = stageParamsResponse._embedded || {};
          const stageParams = embeddedStage.stageParams || [];
          stageParams.forEach((stageParam: StageParam) => {
            this.stageParams[stageParam.stage] = stageParam;
          });
        }
      }),
      map(() => void 0)
    );
  }

  private refreshPoints() {
    return this.pointService.getPoints().pipe(
      tap((teamPoints) => {
        const nextGeneralRanking: Ranking[] = [];
        const nextStageRanking: { [stage: number]: Ranking[] } = {};
        this.FillRanking([...(teamPoints as TeamPoint[])], nextGeneralRanking);

        if (this.isStageMode) {
          const stagePointsByStage = this.BuildStagePoints(teamPoints as TeamPoint[]);
          for (const [stage, stagePoints] of Object.entries(stagePointsByStage)) {
            const stageNumber = parseInt(stage, 10);
            nextStageRanking[stageNumber] = [];
            this.FillRanking(stagePoints, nextStageRanking[stageNumber]);
          }
        }
        if (!sameData(this.generalRanking, nextGeneralRanking)) {
          this.generalRanking = nextGeneralRanking;
        }
        if (!sameData(this.stageRanking, nextStageRanking)) {
          this.stageRanking = nextStageRanking;
        }
        this.updatePrintPanels();
        if (this.presentationMode) {
          this.buildPresentationSlides();
        }
      }),
      switchMap(() => this.isStageMode ? this.loadStagePerformances() : of(void 0))
    );
  }

  private loadStagePerformances() {
    const stages = Object.keys(this.stageRanking).map(v => parseInt(v, 10)).filter(stage => {
      const params = this.stageParams[stage];
      const perfKeys = Object.keys(params?.performancePointParams || {});
      return perfKeys.length === 1;
    });

    if (stages.length === 0) {
      if (Object.keys(this.stagePerformanceValues).length > 0) {
        this.stagePerformanceValues = {};
      }
      return of(void 0);
    }

    const requests = stages.map(stage =>
      this.stageService.getStages({ stage }).pipe(
        map(results => ({ stage, results }))
      )
    );

    return forkJoin(requests).pipe(
      tap(responses => {
        const nextPerformanceValues: { [stage: number]: { name: string, values: { [team: number]: number | null } } } = {};
        responses.forEach(({ stage, results }) => {
          const params = this.stageParams[stage];
          const perfKeys = Object.keys(params?.performancePointParams || {});
          if (perfKeys.length !== 1) {
            return;
          }
          const perfName = perfKeys[0];
          const values: { [team: number]: number | null } = {};
          const embedded: any = results?._embedded || {};
          const stageResults: StageResult[] = embedded.stageResults || embedded.stageResult || embedded.stageResponses || [];
          stageResults.forEach(sr => {
            const perf = sr.performances?.find(p => p.name === perfName);
            values[sr.team] = perf?.performanceValue ?? null;
          });
          nextPerformanceValues[stage] = { name: perfName, values };
        });
        if (!sameData(this.stagePerformanceValues, nextPerformanceValues)) {
          this.stagePerformanceValues = nextPerformanceValues;
          this.updatePrintPanels();
          if (this.presentationMode) {
            this.buildPresentationSlides();
          }
        }
      }),
      map(() => void 0)
    );
  }

  singlePerformanceLabel(stageKey: number | string): string | null {
    const stage = Number(stageKey);
    return this.stagePerformanceValues[stage]?.name || null;
  }

  singlePerformanceValues(stageKey: number | string): { [team: number]: number | null } | null {
    const stage = Number(stageKey);
    return this.stagePerformanceValues[stage]?.values || null;
  }
}
