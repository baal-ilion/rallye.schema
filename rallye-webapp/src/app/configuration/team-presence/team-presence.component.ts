import { Component, OnDestroy, OnInit } from '@angular/core';
import { Team } from '../models/team';
import { TeamService } from '../team.service';
import { HalCollection } from '../../models/hal-collection';
import { TeamUpdateService } from '../../services/team-update.service';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { sameData } from '../../shared/data-change.utils';

@Component({
  selector: 'app-team-presence',
  templateUrl: './team-presence.component.html',
  styleUrls: ['./team-presence.component.css']
})
export class TeamPresenceComponent implements OnInit, OnDestroy {

  teams: Team[] = [];
  presentTeams: Team[] = [];
  absentTeams: Team[] = [];
  cardWidth = 192;
  loading = false;
  error?: string;
  private ignoreNextUpdate = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private teamService: TeamService,
    private teamUpdateService: TeamUpdateService
  ) { }

  ngOnInit(): void {
    this.loadTeams();

    this.teamUpdateService.updates$.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.ignoreNextUpdate) {
        this.ignoreNextUpdate = false;
        return;
      }
      // Rafraîchissement silencieux : on met à jour les listes sans spinner.
      this.loadTeams(true);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTeams(silent: boolean = false): void {
    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    this.teamService.getTeams().subscribe({
      next: (collection: HalCollection<Team, 'teams'>) => {
        const embedded: any = collection._embedded || {};
        const nextTeams = embedded.teams || [];
        if (!sameData(this.teams, nextTeams)) {
          this.teams = nextTeams;
          this.splitTeams();
        }
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

  onPresenceChange(team: Team, value: boolean): void {
    this.teamService.setPresence(team.team, value).subscribe({
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

  isPresent(team: Team): boolean {
    return !!team.present;
  }

  trackTeam(_index: number, team: Team): string | number {
    return team.id ?? team.team;
  }

  private splitTeams(): void {
    const sortByTeam = (a: Team, b: Team) => a.team - b.team;
    this.presentTeams = (this.teams || []).filter(t => this.isPresent(t)).sort(sortByTeam);
    this.absentTeams = (this.teams || []).filter(t => !this.isPresent(t)).sort(sortByTeam);
    this.computeCardWidth();
  }

  private computeCardWidth(): void {
    const all = this.teams || [];
    const maxLen = all.reduce((max, t) => {
      const labelLength = (`Équipe ${t.team} ${t.name || ''}`).length;
      return Math.max(max, labelLength);
    }, 0);
    this.cardWidth = Math.max(192, Math.min(360, Math.round(maxLen * 8 + 48)));
  }
}
