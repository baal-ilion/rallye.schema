import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TeamInfo } from '../models/team-info';
import { ModifyTeamInfoComponent } from '../modify-team-info/modify-team-info.component';
import { TeamInfoService } from '../team-info.service';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';

@Component({
  selector: 'app-list-team-info',
  templateUrl: './list-team-info.component.html',
  styleUrls: ['./list-team-info.component.scss']
})
export class ListTeamInfoComponent implements OnInit {

  teamInfos: TeamInfo[] = [];

  constructor(
    private teamInfoService: TeamInfoService,
    private modalService: NgbModal,
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
    const modalRef = this.modalService.open(ModifyTeamInfoComponent);
    modalRef.componentInstance.teamInfo = {
      team: '',
      name: ''
    };
    modalRef.result.then((result) => {
      console.log(result);
      this.teamInfoService.addTeamInfo(result).subscribe(data => {
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
    const modalRef = this.modalService.open(ModifyTeamInfoComponent);
    modalRef.componentInstance.teamInfo = {
      id: teamInfo.id,
      team: teamInfo.team,
      name: teamInfo.name
    };
    modalRef.result.then((result) => {
      console.log(result);
      this.teamInfoService.updateTeamInfo(result).subscribe(data => {
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
