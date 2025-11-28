import { Component, OnInit } from '@angular/core';
import { TeamInfo } from '../models/team-info';
import { TeamInfoService } from '../team-info.service';
import { HalCollection } from '../../models/hal-collection';

@Component({
  selector: 'app-team-presence',
  templateUrl: './team-presence.component.html',
  styleUrls: ['./team-presence.component.css']
})
export class TeamPresenceComponent implements OnInit {

  teamInfos: TeamInfo[] = [];
  loading = false;
  error?: string;

  constructor(private teamInfoService: TeamInfoService) { }

  ngOnInit(): void {
    this.loadTeams();
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
    const updated: TeamInfo = { ...team, present: value };

    this.teamInfoService.updateTeamInfo(updated).subscribe({
      next: (saved) => {
        team.present = saved.present;
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour de la présence';
        // on remet la valeur précédente en cas d’erreur
        team.present = !value;
      }
    });
  }

  isPresent(team: TeamInfo): boolean {
    // null ou undefined ⇒ considéré comme absent
    return !!team.present;
  }
}

