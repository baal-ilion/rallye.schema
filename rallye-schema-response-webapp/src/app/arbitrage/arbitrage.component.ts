import { Component, OnDestroy, OnInit } from '@angular/core';
import { TeamInfo } from '../param/models/team-info';
import { TeamInfoService } from '../param/team-info.service';
import { RankingUpdateService } from '../services/ranking-update.service';
import { TeamInfoUpdateService } from '../services/team-info-update.service';
import { Subject, firstValueFrom } from 'rxjs';
import { auditTime, takeUntil } from 'rxjs/operators';
import { sameData } from '../shared/data-change.utils';

@Component({
  selector: 'app-arbitrage',
  templateUrl: './arbitrage.component.html',
  styleUrls: ['./arbitrage.component.scss']
})
export class ArbitrageComponent implements OnInit, OnDestroy {
  teams: TeamInfo[] = [];
  selectedTeamId?: string;
  teamNumberInput = '';
  stageNumberInput = '';
  stageFilter?: number;
  loading = false;
  error?: string;
  private destroy$ = new Subject<void>();
  private readonly SelectedTeamStorageKey = 'ArbitrageComponent.selectedTeamId';

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

  async onTeamNumberInput(value: string): Promise<void> {
    this.teamNumberInput = value;
    const num = Number(value);
    const valid = !Number.isNaN(num) && value !== '';
    if (!valid) {
      this.selectedTeamId = undefined;
      sessionStorage.removeItem(this.SelectedTeamStorageKey);
      this.stageNumberInput = '';
      this.stageFilter = undefined;
      return;
    }
    const match = this.teams.find(t => t.team === num);
    this.selectedTeamId = match?.id;
    if (this.selectedTeamId) {
      sessionStorage.setItem(this.SelectedTeamStorageKey, this.selectedTeamId);
      await this.refreshSelectedTeamSilently();
      this.onStageNumberInput(this.stageNumberInput);
    } else {
      sessionStorage.removeItem(this.SelectedTeamStorageKey);
      this.stageNumberInput = '';
      this.stageFilter = undefined;
    }
  }

  onStageNumberInput(value: string): void {
    this.stageNumberInput = value as any;
    if (!this.selectedTeamId) {
      this.stageNumberInput = '';
      this.stageFilter = undefined;
      return;
    }
    const raw = value === null || value === undefined ? '' : value.toString();
    const trimmed = raw.trim();
    if (!trimmed) {
      this.stageFilter = undefined;
      return;
    }
    const num = Number(trimmed);
    this.stageFilter = Number.isFinite(num) ? num : undefined;
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
      const selected = this.teams.find(t => t.id === this.selectedTeamId);
      this.teamNumberInput = selected ? String(selected.team) : '';
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
    // Reutilise la logique du suivi des équipes ; l'enfant gère ses mises à jour.
    return;
  }

}
