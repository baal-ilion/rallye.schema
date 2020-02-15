import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TeamInfoService } from '../team-info.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModifyTeamInfoComponent } from '../modify-team-info/modify-team-info.component';

@Component({
  selector: 'app-list-team-info',
  templateUrl: './list-team-info.component.html',
  styleUrls: ['./list-team-info.component.scss']
})
export class ListTeamInfoComponent implements OnInit {

  teamInfos: any[] = [];

  constructor(private teamInfoService: TeamInfoService, private modalService: NgbModal) { }

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

  modifyTeamInfo(teamInfo) {
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
}
