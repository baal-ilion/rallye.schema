import { DatePipe, KeyValue } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, merge, of, Subject } from 'rxjs';
import { auditTime, catchError, finalize, switchMap, takeUntil, tap, startWith, map } from 'rxjs/operators';
import * as FileSaver from 'file-saver';
import { StageParam } from '../../param/models/stage-param';
import { TeamInfo } from '../../param/models/team-info';
import { StageParamService } from '../../param/stage-param.service';
import { TeamInfoService } from '../../param/team-info.service';
import * as XLSX from 'xlsx';
import { Ranking } from '../models/ranking';
import { TeamPoint } from '../models/team-point';
import { PointService } from '../point.service';
import { RankingComponent } from '../ranking/ranking.component';
import { RankingUpdateService } from '../../services/ranking-update.service';
import { AutoScrollService } from '../../services/auto-scroll.service';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

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
  @ViewChildren(RankingComponent) rankingTables!: QueryList<RankingComponent>;
  @ViewChild('scrollContainer', { static: true }) scrollContainer?: ElementRef<HTMLElement>;
  viewPoints = true;
  autoScrollEnabled = false;
  isStageMode = false;
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  keyOrder = (a: KeyValue<string, Ranking[]>, b: KeyValue<string, Ranking[]>): number => {
    const ak = parseInt(a.key, 10);
    const bk = parseInt(b.key, 10);
    return ak > bk ? 1 : (bk > ak ? -1 : 0);
  };

  constructor(
    private route: ActivatedRoute,
    private pointService: PointService,
    private teamInfoService: TeamInfoService,
    private stageParamService: StageParamService,
    private rankingUpdateService: RankingUpdateService,
    private autoScrollService: AutoScrollService
  ) { }

  ngOnInit() {
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
      this.rankingUpdateService.updates$
    )
      .pipe(
        startWith(null),
        auditTime(200),
        tap(() => { this.loading = true; this.error = null; }),
        switchMap(() => this.refreshData()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.autoScrollService.stop();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToggleAutoScroll(): void {
    this.autoScrollEnabled = !this.autoScrollEnabled;
    if (this.autoScrollEnabled) {
      const target = this.scrollContainer?.nativeElement;
      this.autoScrollService.start(target);
    } else {
      this.autoScrollService.stop();
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
      finalize(() => this.loading = false)
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
    return this.pointService.recomputePoints().pipe(
      tap((teamPoints) => {
        this.generalRanking = [];
        this.stageRanking = {};

        this.FillRanking(teamPoints as TeamPoint[], this.generalRanking);

        if (this.isStageMode) {
          const stagePointsByStage = this.BuildStagePoints(teamPoints as TeamPoint[]);
          for (const [stage, stagePoints] of Object.entries(stagePointsByStage)) {
            const stageNumber = parseInt(stage, 10);
            this.stageRanking[stageNumber] = [];
            this.FillRanking(stagePoints, this.stageRanking[stageNumber]);
          }
        }
      })
    );
  }

  exportExcel() {
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    this.rankingTables.forEach(ranking => {
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(ranking.rankingTable.nativeElement);
      XLSX.utils.book_append_sheet(wb, ws, ranking.rankingTitle.substring(0, 31));
    });
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, 'rallyeschema');
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    const datePipe = new DatePipe('fr-FR');
    FileSaver.saveAs(data, fileName + '-ranking-' + datePipe.transform(Date.now(), 'yyyyMMddhhmmss') + EXCEL_EXTENSION);
  }
}
