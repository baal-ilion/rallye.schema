import { KeyValue } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { forkJoin, merge, of, Subject } from 'rxjs';
import { auditTime, catchError, filter, finalize, startWith, switchMap, takeUntil, tap, map } from 'rxjs/operators';
import { Team } from '../../configuration/models/team';
import { TeamService } from '../../configuration/team.service';
import { GroupRankingEntry, GroupRankingService } from '../../services/group-ranking.service';
import { RankingUpdateService } from '../../services/ranking-update.service';
import { Ranking } from '../models/ranking';
import { FullscreenPresentationService } from '../../services/fullscreen-presentation.service';
import { TeamUpdateService } from '../../services/team-update.service';
import { ApplicationUpdateService } from '../../services/application-update.service';
import { sameData } from '../../shared/data-change.utils';
import { RankingPresentationPanel, RankingPresentationSlide } from '../models/ranking-presentation-slide';

@Component({
  selector: 'app-group-ranking',
  templateUrl: './group-ranking.component.html',
  styleUrls: ['./group-ranking.component.scss']
})
export class GroupRankingComponent implements OnInit, OnDestroy {

  loading = false;
  error: string | null = null;

  // groupName -> ranking entries
  groupRankings: { [groupName: string]: Ranking[] } = {};
  teams: { [team: number]: Team } = {};
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
  private destroy$ = new Subject<void>();
  private presentationTimer: ReturnType<typeof setTimeout> | null = null;
  private presentationLayoutTimer: ReturnType<typeof setTimeout> | null = null;
  private presentationMeasurementTimer: ReturnType<typeof setTimeout> | null = null;
  private presentationMetricsSignature = '';

  groupOrder = (a: KeyValue<string, Ranking[]>, b: KeyValue<string, Ranking[]>) =>
    a.key.localeCompare(b.key);

  toggleViewPoints(): void {
    this.viewPoints = !this.viewPoints;
    localStorage.setItem('ranking-view-points', String(this.viewPoints));
    if (this.presentationMode) {
      this.buildPresentationSlides();
    }
  }

  trackRankingTable(_index: number, item: KeyValue<string, Ranking[]>): string {
    return item.key;
  }

  trackPrintPanel(index: number, panel: RankingPresentationPanel): string {
    return `${panel.title}-${index}`;
  }

  constructor(
    private groupRankingService: GroupRankingService,
    private teamService: TeamService,
    private rankingUpdateService: RankingUpdateService,
    private teamUpdateService: TeamUpdateService,
    private applicationUpdates: ApplicationUpdateService,
    private fullscreenPresentation: FullscreenPresentationService) { }

  ngOnInit(): void {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    window.addEventListener('resize', this.onPresentationViewportChange);
    window.visualViewport?.addEventListener('resize', this.onPresentationViewportChange);
    merge(
      this.rankingUpdateService.updates$,
      this.teamUpdateService.updates$,
      this.applicationUpdates.updates$.pipe(filter(update =>
        update.domain === 'CONFIGURATION' || update.domain === 'DATABASE' || update.domain === 'RESYNC')))
      .pipe(
        startWith('__initial__' as const),          // initial load flag
        auditTime(200),           // regroupe les rafales de messages
        switchMap((flag) => this.refreshData(flag !== '__initial__')),
        takeUntil(this.destroy$)
      ).subscribe();
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
    const panels: RankingPresentationPanel[] = Object.keys(this.groupRankings)
      .sort((left, right) => left.localeCompare(right))
      .map(groupName => ({ title: groupName, ranking: this.groupRankings[groupName] }));
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

  private buildPrintPanels(panels: RankingPresentationPanel[]): RankingPresentationPanel[] {
    // Même capacité que les autres classements : elle tient compte du
    // bandeau de page présent sur la première feuille imprimée.
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
    const panels: RankingPresentationPanel[] = Object.keys(this.groupRankings)
      .sort((left, right) => left.localeCompare(right))
      .map(groupName => ({ title: groupName, ranking: this.groupRankings[groupName] }));
    this.updatePrintLayout(panels);
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
      Math.max(panelMaximum, (this.teams[ranking.team]?.name || '').length), maximum), 0);
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

  private stopPresentationRotation(): void {
    if (this.presentationTimer) {
      clearTimeout(this.presentationTimer);
      this.presentationTimer = null;
    }
  }

  private toRanking(entries: GroupRankingEntry[]): Ranking[] {
    return entries
      .filter(entry => (entry.groupScore ?? 0) > 0)
      .map(entry => ({
        order: entry.groupRank ? entry.groupRank.toString() : '-',
        team: entry.team,
        total: entry.groupScore
      }));
  }

  private refreshData(silentRefresh = false) {
    if (!silentRefresh) {
      this.loading = true;
      this.error = null;
    }

    return this.ensureTeams().pipe(
      switchMap(() => this.refreshGroupRankings()),
      catchError(err => {
        console.error(err);
        this.error = 'Erreur lors du chargement du classement par groupes.';
        return of();
      }),
      finalize(() => {
        if (!silentRefresh) {
          this.loading = false;
        }
      })
    );
  }

  private ensureTeams() {
    if (Object.keys(this.teams).length > 0) {
      return of(void 0);
    }
    return this.teamService.getTeams().pipe(
      tap(teamsResponse => {
        const embedded: any = teamsResponse?._embedded || {};
        const teams = embedded.teams || [];
        teams.forEach((team: Team) => {
          this.teams[team.team] = team;
        });
      }),
      map(() => void 0)
    );
  }

  private refreshGroupRankings() {
    return this.groupRankingService.getGroupRankings().pipe(
      tap(entries => {
        const byGroup: { [groupName: string]: GroupRankingEntry[] } = {};
        entries.forEach(entry => {
          const name = entry.groupName || 'Sans groupe';
          if (!byGroup[name]) {
            byGroup[name] = [];
          }
          byGroup[name].push(entry);
        });

        Object.keys(byGroup).forEach(groupName => {
          byGroup[groupName].sort((a, b) => a.groupRank - b.groupRank);
        });

        const newRankings: { [groupName: string]: Ranking[] } = {};
        Object.keys(byGroup).forEach(groupName => {
          const ranking = this.toRanking(byGroup[groupName]);
          if (ranking.length > 0) {
            newRankings[groupName] = ranking;
          }
        });
        if (!sameData(this.groupRankings, newRankings)) {
          this.groupRankings = newRankings;
          this.updatePrintPanels();
          if (this.presentationMode) {
            this.buildPresentationSlides();
          }
        }
      })
    );
  }

}
