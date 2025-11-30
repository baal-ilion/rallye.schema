import { DatePipe, KeyValue } from '@angular/common';
import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

@Component({
  selector: 'app-list-ranking',
  templateUrl: './list-ranking.component.html',
  styleUrls: ['./list-ranking.component.scss']
})
export class ListRankingComponent implements OnInit {
  generalRanking: Ranking[] = [];
  stageRanking: { [stage: number]: Ranking[] } = {};
  teamInfos: { [team: number]: TeamInfo } = {};
  stageParams: { [stage: number]: StageParam } = {};
  @ViewChildren(RankingComponent) rankingTables!: QueryList<RankingComponent>;
  viewPoints = true;
  isStageMode = false;

  keyOrder = (a: KeyValue<string, Ranking[]>, b: KeyValue<string, Ranking[]>): number => {
    const ak = parseInt(a.key, 10);
    const bk = parseInt(b.key, 10);
    return ak > bk ? 1 : (bk > ak ? -1 : 0);
  };

  constructor(
    private route: ActivatedRoute,
    private pointService: PointService,
    private teamInfoService: TeamInfoService,
    private stageParamService: StageParamService) { }

  ngOnInit() {
    this.LoadTeamInfos();
    this.route.queryParamMap.subscribe(params => {
      this.isStageMode = params.get('mode') === 'stage';
      if (this.isStageMode) {
        this.LoadStageParam();
      }
      this.LoadRanking();
    });
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

  private LoadRanking() {
    this.generalRanking = [];
    this.stageRanking = {};

    this.pointService.recomputePoints().subscribe(data => {
      const teamPoints = data as TeamPoint[];

      this.FillRanking(teamPoints, this.generalRanking);

      if (this.isStageMode) {
        const stagePointsByStage = this.BuildStagePoints(teamPoints);
        for (const [stage, stagePoints] of Object.entries(stagePointsByStage)) {
          const stageNumber = parseInt(stage, 10);
          this.stageRanking[stageNumber] = [];
          this.FillRanking(stagePoints, this.stageRanking[stageNumber]);
        }
      }
    }, () => {
      this.generalRanking = [];
      this.stageRanking = {};
    });
  }

  private LoadStageParam() {
    this.stageParams = {};
    this.stageParamService.getStageParams().subscribe((value) => {
      const stageParams = value._embedded.stageParams;
      this.stageParams = {};
      stageParams.forEach(stageParam => {
        this.stageParams[stageParam.stage] = stageParam;
      });
    }, () => {
      this.stageParams = {};
    });
  }

  private LoadTeamInfos() {
    this.teamInfos = {};
    this.teamInfoService.getTeamInfos().subscribe((value) => {
      const teamInfos = value._embedded.teamInfoes;
      this.teamInfos = {};
      teamInfos.forEach(teamInfo => {
        this.teamInfos[teamInfo.team] = teamInfo;
      });
    }, () => {
      this.teamInfos = {};
    });
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
