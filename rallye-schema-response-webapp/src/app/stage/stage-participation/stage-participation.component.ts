import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { StageParam } from 'src/app/param/models/stage-param';
import { StageParamService } from 'src/app/param/stage-param.service';
import { TeamInfo } from 'src/app/param/models/team-info';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';
import { HttpErrorResponse } from '@angular/common/http';

interface StageParticipationRow {
  team: TeamInfo;
  result?: StageResult;
}

interface StageParticipationStatus {
  notStarted: StageParticipationRow[];
  inProgress: StageParticipationRow[];
  finished: StageParticipationRow[];
}

@Component({
  selector: 'app-stage-participation',
  templateUrl: './stage-participation.component.html',
  styleUrls: ['./stage-participation.component.scss']
})
export class StageParticipationComponent implements OnInit, OnDestroy {
  stageParams: StageParam[] = [];
  selectedStage?: number;

  teams: TeamInfo[] = [];
  statuses: StageParticipationStatus = { notStarted: [], inProgress: [], finished: [] };

  loading = false;
  error?: string;

  private destroy$ = new Subject<void>();

  constructor(
    private stageParamService: StageParamService,
    private stageService: StageService,
    private teamInfoService: TeamInfoService,
    private rankingUpdateService: RankingUpdateService,
    private confirmationDialogService: ConfirmationDialogService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initData();
    this.rankingUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshParticipation(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedStageLabel(): string {
    const stageParam = this.stageParams.find(s => s.stage === this.selectedStage);
    return stageParam ? stageParam.name : '';
  }

  async onStageChange(stageValue: string): Promise<void> {
    const parsed = Number(stageValue);
    this.selectedStage = Number.isNaN(parsed) ? undefined : parsed;
    await this.refreshParticipation();
  }

  async startStage(row: StageParticipationRow, navigateAfterStart = false): Promise<void> {
    if (!this.selectedStage) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Début d\'une épreuve',
        'Démarrer l\'épreuve ' + this.selectedStage + '\u00A0?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      this.error = undefined;
      row.result = await firstValueFrom(this.stageService.beginStage(this.selectedStage, row.team.team));
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
      if (navigateAfterStart) {
        await this.router.navigate(['/stage', row.team.team, this.selectedStage]);
      }
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de démarrer l\'épreuve pour cette équipe.';
    }
  }

  async openStage(row: StageParticipationRow): Promise<void> {
    if (!this.selectedStage) {
      return;
    }
    if (!row.result) {
      await this.startStage(row, true);
      return;
    }
    try {
      await this.router.navigate(['/stage', row.team.team, this.selectedStage]);
    } catch (error) {
      console.log(error);
      this.error = 'Impossible d\'ouvrir l\'épreuve pour cette équipe.';
    }
  }

  async stopStage(row: StageParticipationRow): Promise<void> {
    if (!this.selectedStage || !row.result) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Fin d\'une épreuve',
        'Terminer l\'épreuve ' + this.selectedStage + '\u00A0?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      const result = await firstValueFrom(this.stageService.endStage(this.selectedStage, row.team.team));
      row.result = result;
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de terminer l\'épreuve pour cette équipe.';
    }
  }

  async cancelStage(row: StageParticipationRow): Promise<void> {
    if (!this.selectedStage || !row.result) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Annulation d\'une épreuve',
        'Annuler l\'épreuve ' + this.selectedStage + '\u00A0?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      await firstValueFrom(this.stageService.cancelStage(this.selectedStage, row.team.team));
      row.result = undefined;
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible d\'annuler l\'épreuve pour cette équipe.';
    }
  }

  async undoStage(row: StageParticipationRow): Promise<void> {
    if (!this.selectedStage || !row.result) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Reprise d\'une épreuve',
        'Reprendre l\'épreuve ' + this.selectedStage + '\u00A0?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      row.result = await firstValueFrom(this.stageService.undoStage(this.selectedStage, row.team.team));
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de reprendre l\'épreuve pour cette équipe.';
    }
  }

  private async initData(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const [stageParamCollection, teamInfoCollection] = await Promise.all([
        firstValueFrom(this.stageParamService.getStageParams()),
        firstValueFrom(this.teamInfoService.getTeamInfos())
      ]);

      this.stageParams = (stageParamCollection?._embedded?.stageParams ?? []).sort((a, b) => a.stage - b.stage);
      this.teams = (teamInfoCollection?._embedded?.teamInfoes ?? teamInfoCollection?._embedded?.teamInfos ?? [])
        .sort((a, b) => a.team - b.team);

      if (!this.selectedStage && this.stageParams.length > 0) {
        this.selectedStage = this.stageParams[0].stage;
      }
    } catch (error) {
      console.log(error);
      this.error = 'Erreur lors du chargement des données.';
    } finally {
      this.loading = false;
    }

    await this.refreshParticipation();
  }

  private async refreshParticipation(silent: boolean = false): Promise<void> {
    if (!this.selectedStage) {
      this.statuses = { notStarted: [], inProgress: [], finished: [] };
      return;
    }

    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    try {
      const stageResultCollection = await firstValueFrom(
        this.stageService.getStages({ stage: this.selectedStage, sortBy: ['team,asc'] })
      );
      const stageResults = stageResultCollection?._embedded?.stageResults ?? [];
      this.statuses = this.computeStatuses(stageResults);
    } catch (error) {
      console.log(error);
      if (!silent) {
        this.error = 'Erreur lors du chargement des participations.';
      }
    } finally {
      if (!silent) {
        this.loading = false;
      }
    }
  }

  private computeStatuses(stageResults: StageResult[]): StageParticipationStatus {
    const byTeam = new Map<number, StageResult>();
    stageResults.forEach(result => byTeam.set(result.team, result));

    const notStarted: StageParticipationRow[] = [];
    const inProgress: StageParticipationRow[] = [];
    const finished: StageParticipationRow[] = [];

    for (const team of this.teams) {
      const result = byTeam.get(team.team);
      if (!result?.begin) {
        notStarted.push({ team, result });
      } else if (!result?.end) {
        inProgress.push({ team, result });
      } else {
        finished.push({ team, result });
      }
    }

    return { notStarted, inProgress, finished };
  }

  async startAllNotStarted(): Promise<void> {
    if (!this.selectedStage) {
      return;
    }
    const targets = this.statuses.notStarted.filter(row => !row.result?.begin);
    if (targets.length === 0) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Démarrer en masse',
        'Démarrer l\'épreuve ' + this.selectedStage + ' pour toutes les équipes non démarrées ?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      this.loading = true;
      this.error = undefined;
      await Promise.all(targets.map(row => firstValueFrom(this.stageService.beginStage(this.selectedStage, row.team.team))));
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de démarrer l\'épreuve en masse.';
    } finally {
      this.loading = false;
    }
  }

  async stopAllInProgress(): Promise<void> {
    if (!this.selectedStage) {
      return;
    }
    const targets = this.statuses.inProgress.filter(row => row.result?.begin && !row.result?.end);
    if (targets.length === 0) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Terminer en masse',
        'Terminer l\'épreuve ' + this.selectedStage + ' pour toutes les équipes en cours ?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      this.loading = true;
      this.error = undefined;
      await Promise.all(targets.map(row => firstValueFrom(this.stageService.endStage(this.selectedStage, row.team.team))));
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de terminer l\'épreuve en masse.';
    } finally {
      this.loading = false;
    }
  }
}


