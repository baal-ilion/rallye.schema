import { Component, OnInit, Input } from '@angular/core';
import { TeamInfoService } from '../param/team-info.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  @Input() title: string;
  public collapsed = true;
  teamInfos = [];

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
