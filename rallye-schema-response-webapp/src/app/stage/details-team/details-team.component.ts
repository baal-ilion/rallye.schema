import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { auditTime, takeUntil } from 'rxjs/operators';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { StageParam } from 'src/app/param/models/stage-param';
import { TeamInfo } from 'src/app/param/models/team-info';
import { StageParamService } from 'src/app/param/stage-param.service';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';

@Component({
  selector: 'app-details-team',
  templateUrl: './details-team.component.html',
  styleUrls: ['./details-team.component.scss']
})
export class DetailsTeamComponent implements OnInit, OnDestroy {
  id: string;
  teamInfo: TeamInfo;
  stageParams: StageParam[] = [];
  stages: { [stage: number]: StageResult } = {};
  private destroy$ = new Subject<void>();

  constructor(
    private teamInfoService: TeamInfoService,
    private stageParamService: StageParamService,
    private stageService: StageService,
    private route: ActivatedRoute,
    private confirmationDialogService: ConfirmationDialogService,
    private router: Router,
    private rankingUpdateService: RankingUpdateService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit() {
    console.log('ngOnInit');
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id');
      this.init();
    }, error => {
      this.teamInfo = null;
      console.log(error);
      this.router.navigateByUrl('/');
    });
    this.loadStageParams();

    // Rafraîchissement event-driven : dès qu'un classement/score change, recharger l'équipe/stages
    this.rankingUpdateService.updates$
      .pipe(
        auditTime(200),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.refreshTeamData());
  }

  private async init() {
    await this.refreshTeamData();
  }

  private async refreshTeamData() {
    await this.loadTeamInfo(this.id);
  }

  private async loadTeamInfo(id: string) {
    const previousTeam = this.teamInfo?.team;
    try {
      console.log('loadTeamInfo:' + id);
      this.teamInfo = await this.teamInfoService.findById(id).toPromise();
      if (this.teamInfo?.team !== previousTeam) {
        this.stages = {};
      }
    } catch (error) {
      this.teamInfo = null;
      console.log(error);
      this.router.navigateByUrl('/');
    }
    await this.loadStages(this.teamInfo?.team);
  }

  private async loadStages(team: number) {
    try {
      const stages = await this.stageService.getStagesByTeam(team).toPromise();
      const stageResults = stages._embedded.stageResults;
      if (stageResults) {
        for (const stage of stageResults) {
          this.stages[stage.stage] = stage;
        }
      }
    } catch (error) {
      this.stages = {};
      console.log(error);
    }
  }

  private async loadStageParams() {
    try {
      const stageParams = (await this.stageParamService.getStageParams().toPromise())?._embedded?.stageParams ?? [];
      stageParams.sort((a, b) => (a.stage > b.stage) ? 1 : -1);
      this.stageParams = stageParams;
    } catch (error) {
      this.stageParams = [];
      console.log(error);
    }
  }

  onStartStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Début d\'une épreuve',
      'Démarrer l\'épreuve ' + stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.beginStage(stage, this.teamInfo.team).subscribe(() => {
            this.refreshTeamData();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onStopStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Fin d\'une épreuve',
      'Terminer l\'épreuve ' + stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.endStage(stage, this.teamInfo.team).subscribe(() => {
            this.refreshTeamData();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onCancelStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Annulation d\'une épreuve',
      'Annuler l\'épreuve ' + stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.cancelStage(stage, this.teamInfo.team).subscribe(() => {
            this.refreshTeamData();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onUndoStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Reprise d\'une épreuve',
      'Reprendre l\'épreuve ' + stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.undoStage(stage, this.teamInfo.team).subscribe(() => {
            this.refreshTeamData();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }
}
