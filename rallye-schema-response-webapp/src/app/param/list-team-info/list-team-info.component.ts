import { Component, OnInit } from '@angular/core';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { TeamInfo } from '../models/team-info';
import { ModifyTeamInfoComponent } from '../modify-team-info/modify-team-info.component';
import { TeamInfoService } from '../team-info.service';

@Component({
  selector: 'app-list-team-info',
  templateUrl: './list-team-info.component.html',
  styleUrls: ['./list-team-info.component.scss']
})
export class ListTeamInfoComponent implements OnInit {

  teamInfos: TeamInfo[] = [];

  constructor(
    private teamInfoService: TeamInfoService,
    private dialogService: DialogService,
    private confirmationDialogService: ConfirmationDialogService
  ) { }

  ngOnInit() {
    this.teamInfoService.getTeamInfos().subscribe((value) => {
      this.teamInfos = value._embedded.teamInfoes;
      this.teamInfos.sort((a, b) => (a.team > b.team) ? 1 : -1);
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
        this.ngOnInit();
      }, err => {
        console.log(err);
        this.ngOnInit();
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
        teamInfo.name = data.name;
      }, err => {
        console.log(err);
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
        this.ngOnInit();
      } catch (error) {
        console.log(error);
        this.ngOnInit();
      }
    } catch (error) {
      console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      this.ngOnInit();
    }
  }
}
