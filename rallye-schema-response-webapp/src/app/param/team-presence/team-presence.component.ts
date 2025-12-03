import { Component, OnInit } from '@angular/core';
import { TeamInfo } from '../models/team-info';
import { TeamInfoService } from '../team-info.service';
import { HalCollection } from '../../models/hal-collection';
import { TeamInfoUpdateService } from '../../services/team-info-update.service';

@Component({
  selector: 'app-team-presence',
  templateUrl: './team-presence.component.html',
  styleUrls: ['./team-presence.component.css']
})
export class TeamPresenceComponent implements OnInit {

  teamInfos: TeamInfo[] = [];
  loading = false;
  error?: string;

  constructor(
    private teamInfoService: TeamInfoService,
    private teamInfoUpdateService: TeamInfoUpdateService
  ) { }

  ngOnInit(): void {
    this.loadTeams();

    this.teamInfoUpdateService.updates$.subscribe(() => {
      this.loadTeams();
    });
  }

  loadTeams(): void {
    this.loading = true;
    this.error = undefined;
    this.teamInfoService.getTeamInfos().subscribe({
      next: (collection: HalCollection<TeamInfo>) => {
        const embedded: any = collection._embedded || {};
        this.teamInfos = embedded.teamInfoes || embedded.teamInfos || [];
        this.loading = false;
      }
    });
  }

  onPresenceChange(team: TeamInfo, value: boolean): void {
    this.teamInfoService.setPresence(team.team, value).subscribe({
      next: (saved) => {
        team.present = saved.present;
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour de la présence';
        team.present = !value;
      }
    });
  }

  isPresent(team: TeamInfo): boolean {
    return !!team.present;
  }
}
