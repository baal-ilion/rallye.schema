import { Component, OnDestroy, OnInit } from '@angular/core';
import { StageService } from '../stage.service';
import { StageParamService } from 'src/app/param/stage-param.service';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { sameData } from 'src/app/shared/data-change.utils';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StageResult } from '../models/stage-result';
import { StageParam } from 'src/app/param/models/stage-param';
import { TeamInfo } from 'src/app/param/models/team-info';

interface ActiveStageRow {
  team: TeamInfo;
  stageResults: StageResult[];
  stageNames: string[];
}

@Component({
  selector: 'app-team-active-stages',
  templateUrl: './team-active-stages.component.html',
  styleUrls: ['./team-active-stages.component.scss']
})
export class TeamActiveStagesComponent implements OnInit, OnDestroy {
  rows: ActiveStageRow[] = [];
  teams: TeamInfo[] = [];
  loading = false;
  error?: string;

  private destroy$ = new Subject<void>();

  constructor(
    private stageService: StageService,
    private stageParamService: StageParamService,
    private teamInfoService: TeamInfoService,
    private rankingUpdateService: RankingUpdateService
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.rankingUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackTeamRow(_index: number, row: ActiveStageRow): string | number {
    return row.team.id ?? row.team.team;
  }

  trackStage(_index: number, stage: StageResult): string {
    return stage.id;
  }

  private async loadData(silent = false): Promise<void> {
    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    try {
      const [stageResultCollection, stageParamCollection, teamInfoCollection] = await Promise.all([
        firstValueFrom(this.stageService.getStages({ finished: false, sortBy: ['team,asc'] })),
        firstValueFrom(this.stageParamService.getStageParams()),
        firstValueFrom(this.teamInfoService.getTeamInfos())
      ]);

      const stageParams: StageParam[] = stageParamCollection?._embedded?.stageParams ?? [];
      const stageParamMap = new Map<number, string>(stageParams.map(s => [s.stage, s.name]));

      const nextTeams = (teamInfoCollection?._embedded?.teamInfoes ?? teamInfoCollection?._embedded?.teamInfos ?? [])
        .sort((a, b) => a.team - b.team);

      const stageResults: StageResult[] = (stageResultCollection?._embedded?.stageResults ?? [])
        .filter(r => r.begin && !r.end);

      const inProgressByTeam = new Map<number, StageResult[]>();
      stageResults.forEach(result => {
        if (result.begin && !result.end) {
          const list = inProgressByTeam.get(result.team) ?? [];
          list.push(result);
          inProgressByTeam.set(result.team, list);
        }
      });

      const nextRows = nextTeams.map(team => {
        const teamResults = inProgressByTeam.get(team.team) ?? [];
        return {
          team,
          stageResults: teamResults,
          stageNames: teamResults.map(r => stageParamMap.get(r.stage) || `Épreuve ${r.stage}`)
        };
      });
      if (!sameData(this.teams, nextTeams) || !sameData(this.rows, nextRows)) {
        this.teams = nextTeams;
        this.rows = nextRows;
      }
    } catch (err) {
      console.log(err);
      this.error = 'Erreur lors du chargement des épreuves en cours.';
    } finally {
      if (!silent) {
        this.loading = false;
      }
    }
  }
}
