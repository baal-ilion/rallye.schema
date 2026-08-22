import { Component, OnDestroy, OnInit } from '@angular/core';
import { TeamInfo } from 'src/app/param/models/team-info';
import { TeamInfoService } from 'src/app/param/team-info.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { TeamInfoUpdateService } from 'src/app/services/team-info-update.service';
import { Subject, firstValueFrom } from 'rxjs';
import { auditTime, takeUntil } from 'rxjs/operators';
import { sameData } from 'src/app/shared/data-change.utils';

@Component({
  selector: 'app-team-progress',
  templateUrl: './team-progress.component.html',
  styleUrls: ['./team-progress.component.scss']
})
export class TeamProgressComponent implements OnInit, OnDestroy {
  teams: TeamInfo[] = [];
  selectedTeamId?: string;
  loading = false;
  error?: string;
  private destroy$ = new Subject<void>();
  private readonly SelectedTeamStorageKey = 'TeamProgressComponent.selectedTeamId';

  constructor(
    private teamInfoService: TeamInfoService,
    private rankingUpdateService: RankingUpdateService,
    private teamUpdates: TeamInfoUpdateService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadTeams();
    this.rankingUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshSelectedTeamSilently());
    this.teamUpdates.updates$.pipe(
      auditTime(100),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadTeams(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackTeam(_index: number, team: TeamInfo): string | number {
    return team.id ?? team.team;
  }

  async onTeamChange(teamId: string): Promise<void> {
    this.selectedTeamId = teamId || undefined;
    sessionStorage.setItem(this.SelectedTeamStorageKey, this.selectedTeamId ?? '');
    await this.refreshSelectedTeamSilently();
  }

  private async loadTeams(silent = false): Promise<void> {
    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    try {
      const collection = await firstValueFrom(this.teamInfoService.getTeamInfos());
      const embedded: any = collection?._embedded || {};
      const nextTeams = (embedded.teamInfoes || embedded.teamInfos || []).sort((a: TeamInfo, b: TeamInfo) => a.team - b.team);
      if (!sameData(this.teams, nextTeams)) {
        this.teams = nextTeams;
      }
      if (!this.selectedTeamId) {
        const stored = sessionStorage.getItem(this.SelectedTeamStorageKey);
        if (stored) {
          this.selectedTeamId = stored;
        } else if (this.teams.length > 0) {
          this.selectedTeamId = this.teams[0].id;
        }
      }
      if (this.selectedTeamId) {
        sessionStorage.setItem(this.SelectedTeamStorageKey, this.selectedTeamId);
      }
    } catch (err) {
      console.log(err);
      this.error = 'Erreur lors du chargement des équipes.';
    } finally {
      if (!silent) {
        this.loading = false;
      }
    }
  }

  private async refreshSelectedTeamSilently(): Promise<void> {
    // Rien de plus à faire ici pour l'instant : le composant enfant DetailsTeam gère ses propres rafraîchissements via WebSocket.
    // Cette méthode existe pour être déclenchée sur updates$ si on ajoute un jour du contexte autour.
    return;
  }

}
