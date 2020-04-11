import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { interval } from 'rxjs/internal/observable/interval';
import { startWith, switchMap } from 'rxjs/operators';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { TeamInfo } from 'src/app/param/models/team-info';
import { StageParamService } from 'src/app/param/stage-param.service';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';

@Component({
  selector: 'app-details-team',
  templateUrl: './details-team.component.html',
  styleUrls: ['./details-team.component.scss']
})
export class DetailsTeamComponent implements OnInit {
  teamInfo: TeamInfo;
  stageParams = [];
  stages: { [stage: number]: StageResult } = {};

  constructor(
    private teamInfoService: TeamInfoService,
    private stageParamService: StageParamService,
    private stageService: StageService,
    private route: ActivatedRoute,
    private confirmationDialogService: ConfirmationDialogService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params.id;
      this.teamInfoService.findById(id).subscribe(teamInfo => {
        this.teamInfo = teamInfo;
        this.stages = {};
        interval(1000).pipe(
          startWith(0),
          switchMap(() => this.stageService.getStagesByTeam(this.teamInfo.team))
        ).subscribe(stages => {
          const stageResults = stages._embedded.stageResults;
          if (stageResults) {
            for (const stage of stageResults) {
              this.stages[stage.stage] = stage;
            }
          }
        });
      }, error => {
        this.teamInfo = null;
        console.log(error);
        this.router.navigateByUrl('/');
      });
    }, error => {
      this.teamInfo = null;
      console.log(error);
      this.router.navigateByUrl('/');
    });

    this.stageParamService.getStageParams().subscribe(stageParams => {
      this.stageParams = stageParams._embedded.stageParams;
    }, error => {
      this.stageParams = [];
      console.log(error);
    });
  }

  onStartStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Démarrer l\'étape',
      'Démarrer l\'étape ' + stage + ' ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.beginStage(stage, this.teamInfo.team).subscribe(() => {
            this.ngOnInit();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onStopStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Finir l\'étape',
      'Finir l\'étape ' + stage + ' ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.endStage(stage, this.teamInfo.team).subscribe(() => {
            this.ngOnInit();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onCancelStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Annuler l\'étape',
      'Annuler la participation à l\'étape ' + stage + ' ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.cancelStage(stage, this.teamInfo.team).subscribe(() => {
            this.ngOnInit();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onUndoStage(stage: number) {
    this.confirmationDialogService.confirm(
      'Annuler la fin de l\'étape',
      'Annuler la fin de l\'étape ' + stage + ' ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.stageService.undoStage(stage, this.teamInfo.team).subscribe(() => {
            this.ngOnInit();
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }
}
