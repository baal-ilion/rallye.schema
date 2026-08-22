import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TeamInfoUpdateService } from 'src/app/services/team-info-update.service';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { TeamInfo } from '../models/team-info';
import { ModifyTeamInfoComponent } from '../modify-team-info/modify-team-info.component';
import { TeamInfoService } from '../team-info.service';
import { sameData } from 'src/app/shared/data-change.utils';

@Component({
  selector: 'app-list-team-info',
  templateUrl: './list-team-info.component.html',
  styleUrls: ['./list-team-info.component.scss']
})
export class ListTeamInfoComponent implements OnInit, OnDestroy {

  teamInfos: TeamInfo[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private teamInfoService: TeamInfoService,
    private dialogService: DialogService,
    private confirmationDialogService: ConfirmationDialogService,
    private teamUpdates: TeamInfoUpdateService
  ) { }

  ngOnInit() {
    this.teamUpdates.updates$.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadTeams());
    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackTeam(_index: number, team: TeamInfo): string | number {
    return team.id ?? team.team;
  }

  private loadTeams() {
    this.teamInfoService.getTeamInfos().subscribe((value) => {
      const nextTeams = [...(value._embedded.teamInfoes ?? [])].sort((a, b) => (a.team > b.team) ? 1 : -1);
      if (!sameData(this.teamInfos, nextTeams)) {
        this.teamInfos = nextTeams;
      }
    }, (error) => {
      this.teamInfos = [];
    });
  }

  addTeamInfo() {
    const modalRef = this.dialogService.open(ModifyTeamInfoComponent);
    modalRef.componentInstance.teamInfo = {
      team: null as any,
      name: '',
      present: false
    };
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) { return; }
      this.teamInfoService.addTeamInfo(result as TeamInfo).subscribe(data => {
        this.loadTeams();
      }, err => {
        console.log(err);
        this.loadTeams();
      });
    }).catch((error) => {
      console.log(error);
    });
  }

  modifyTeamInfo(teamInfo: TeamInfo) {
    const modalRef = this.dialogService.open(ModifyTeamInfoComponent);
    modalRef.componentInstance.teamInfo = {
      id: teamInfo.id,
      team: teamInfo.team,
      name: teamInfo.name,
      present: teamInfo.present
    };
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) { return; }
      this.teamInfoService.updateTeamInfo(result as TeamInfo).subscribe(data => {
        this.loadTeams();
      }, err => {
        console.log(err);
        this.loadTeams();
      });
    }).catch((error) => {
      console.log(error);
    });
  }

  async deleteTeamInfo(teamInfo: TeamInfo) {
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Suppression de l\'équipe ' + teamInfo.name,
        'Cette opération est irréversible.\nVoulez-vous supprimer l\'équipe ' + teamInfo.team + ' - ' + teamInfo.name + ' ?',
        'Oui', 'Non');
      console.log('User confirmed:', confirmed);
      try {
        if (confirmed) {
          await this.teamInfoService.deleteTeamInfo(teamInfo.id).toPromise();
        }
        this.loadTeams();
      } catch (error) {
        console.log(error);
        this.loadTeams();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      this.loadTeams();
    }
  }
}
