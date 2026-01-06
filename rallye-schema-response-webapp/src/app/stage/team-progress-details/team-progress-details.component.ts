import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { auditTime, takeUntil } from 'rxjs/operators';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { StageParam } from 'src/app/param/models/stage-param';
import { TeamInfo } from 'src/app/param/models/team-info';
import { StageParamService } from 'src/app/param/stage-param.service';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-team-progress-details',
  templateUrl: './team-progress-details.component.html',
  styleUrls: ['./team-progress-details.component.scss']
})
export class TeamProgressDetailsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() teamId?: string;
  @Input() navigateOnStart = false;
  @Input() stageFilter?: number;

  teamInfo: TeamInfo;
  stageParams: StageParam[] = [];
  stages: { [stage: number]: StageResult } = {};
  loading = false;
  error?: string;
  private destroy$ = new Subject<void>();
  private ignoreNextUpdate = false;

  constructor(
    private teamInfoService: TeamInfoService,
    private stageParamService: StageParamService,
    private stageService: StageService,
    private confirmationDialogService: ConfirmationDialogService,
    private rankingUpdateService: RankingUpdateService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.init();
    this.loadStageParams();

    this.rankingUpdateService.updates$
      .pipe(
        auditTime(200),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.ignoreNextUpdate) {
          this.ignoreNextUpdate = false;
          return;
        }
        this.refreshTeamData();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.teamId && !changes.teamId.isFirstChange()) {
      this.init();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async init() {
    await this.refreshTeamData();
  }

  private async refreshTeamData() {
    if (!this.teamId) {
      this.teamInfo = null;
      this.stages = {};
      return;
    }
    await this.loadTeamInfo(this.teamId);
  }

  private async loadTeamInfo(id: string) {
    const previousTeam = this.teamInfo?.team;
    try {
      this.teamInfo = await this.teamInfoService.findById(id).toPromise();
      if (this.teamInfo?.team !== previousTeam) {
        this.stages = {};
      }
    } catch (error) {
      this.teamInfo = null;
      this.stages = {};
      this.error = 'Erreur lors du chargement de l\'équipe.';
    }
    if (this.teamInfo?.team) {
      await this.loadStages(this.teamInfo.team);
    }
  }

  private async loadStages(team: number) {
    try {
      const stages = await this.stageService.getStagesByTeam(team).toPromise();
      const stageResults = stages._embedded.stageResults;
      const incomingStages = stageResults ?? [];

      const incomingKeys = new Set(incomingStages.map(s => s.stage));
      Object.keys(this.stages).forEach(k => {
        const key = Number(k);
        if (!incomingKeys.has(key)) {
          delete this.stages[key];
        }
      });

      for (const stage of incomingStages) {
        this.stages[stage.stage] = stage;
      }
    } catch (error) {
      this.stages = {};
    }
  }

  private async loadStageParams() {
    try {
      const stageParams = (await this.stageParamService.getStageParams().toPromise())?._embedded?.stageParams ?? [];
      stageParams.sort((a, b) => (a.stage > b.stage) ? 1 : -1);
      this.stageParams = stageParams;
    } catch (error) {
      this.stageParams = [];
    }
  }

  get stageParamsToDisplay(): StageParam[] {
    if (this.stageFilter === undefined) {
      return this.stageParams;
    }
    const filter = Number(this.stageFilter);
    if (!Number.isFinite(filter)) {
      return this.stageParams;
    }
    return this.stageParams.filter(s => s.stage === filter);
  }

  onStartStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Début d\'une épreuve',
      'Démarrer l\'épreuve ' + stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.stageService.beginStage(stage, this.teamInfo.team).subscribe(result => {
            if (result) { this.stages[stage] = result; }
            this.ignoreNextUpdate = true;
            this.rankingUpdateService.triggerUpdate();
            if (this.navigateOnStart) {
              this.router.navigate(["/stage", this.teamInfo.team, stage]).catch(() => { });
            }
          });
        }
      })
      .catch(() => { });
  }

  onStopStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Fin d\'une épreuve',
      'Terminer l\'épreuve ' + stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.stageService.endStage(stage, this.teamInfo.team).subscribe(result => {
            if (result) { this.stages[stage] = result; }
            this.ignoreNextUpdate = true;
            this.rankingUpdateService.triggerUpdate();
            if (this.navigateOnStart) {
              this.router.navigate(["/stage", this.teamInfo.team, stage]).catch(() => { });
            }
          });
        }
      })
      .catch(() => { });
  }

  onCancelStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Annulation d\'une épreuve',
      'Annuler l\'épreuve ' + stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.stageService.cancelStage(stage, this.teamInfo.team).subscribe(() => {
            delete this.stages[stage];
            this.ignoreNextUpdate = true;
            this.rankingUpdateService.triggerUpdate();
          });
        }
      })
      .catch(() => { });
  }

  onUndoStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Reprise d\'une épreuve',
      'Reprendre l\'épreuve ' + stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.stageService.undoStage(stage, this.teamInfo.team).subscribe(result => {
            if (result) { this.stages[stage] = result; }
            this.ignoreNextUpdate = true;
            this.rankingUpdateService.triggerUpdate();
            if (this.navigateOnStart) {
              this.router.navigate(["/stage", this.teamInfo.team, stage]).catch(() => { });
            }
          });
        }
      })
      .catch(() => { });
  }
}


