import { Component, Input, OnInit } from '@angular/core';
import { TeamInfo } from '../param/models/team-info';
import { TeamInfoService } from '../param/team-info.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  @Input() title: string;
  public collapsed = true;
  teamInfos: TeamInfo[] = [];

  constructor(private teamInfoService: TeamInfoService) { }

  ngOnInit() {
    this.teamInfoService.getTeamInfos().subscribe((value) => {
      const teamInfos = value._embedded.teamInfoes;
      teamInfos.sort((a, b) => (a.team > b.team) ? 1 : -1);
      this.teamInfos = teamInfos;
    }, (error) => {
      this.teamInfos = [];
    });
  }

}
