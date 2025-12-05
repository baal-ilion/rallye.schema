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
  presentTeams: TeamInfo[] = [];
  absentTeams: TeamInfo[] = [];
  cardWidth = 192;
  loading = false;
  error?: string;
  private ignoreNextUpdate = false;

  constructor(
    private teamInfoService: TeamInfoService,
    private teamInfoUpdateService: TeamInfoUpdateService
  ) { }

  ngOnInit(): void {
    this.loadTeams();

    this.teamInfoUpdateService.updates$.subscribe(() => {
      if (this.ignoreNextUpdate) {
        this.ignoreNextUpdate = false;
        return;
      }
      // Rafraîchissement silencieux : on met à jour les listes sans spinner.
      this.loadTeams(true);
    });
  }

  loadTeams(silent: boolean = false): void {
    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    this.teamInfoService.getTeamInfos().subscribe({
      next: (collection: HalCollection<TeamInfo>) => {
        const embedded: any = collection._embedded || {};
        this.teamInfos = embedded.teamInfoes || embedded.teamInfos || [];
        this.splitTeams();
        if (!silent) {
          this.loading = false;
        }
      },
      error: () => {
        if (!silent) {
          this.loading = false;
          this.error = 'Erreur lors du rechargement des équipes.';
        }
      }
    });
  }

  onPresenceChange(team: TeamInfo, value: boolean): void {
    this.teamInfoService.setPresence(team.team, value).subscribe({
      next: (saved) => {
        team.present = saved.present;
        this.splitTeams();
        this.ignoreNextUpdate = true;
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

  private splitTeams(): void {
    const sortByTeam = (a: TeamInfo, b: TeamInfo) => a.team - b.team;
    this.presentTeams = (this.teamInfos || []).filter(t => this.isPresent(t)).sort(sortByTeam);
    this.absentTeams = (this.teamInfos || []).filter(t => !this.isPresent(t)).sort(sortByTeam);
    this.computeCardWidth();
  }

  private computeCardWidth(): void {
    const all = this.teamInfos || [];
    const maxLen = all.reduce((max, t) => {
      const labelLength = (`Équipe ${t.team} ${t.name || ''}`).length;
      return Math.max(max, labelLength);
    }, 0);
    this.cardWidth = Math.max(192, Math.min(360, Math.round(maxLen * 8 + 48)));
  }
}
