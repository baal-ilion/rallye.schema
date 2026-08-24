import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { ChallengeConfiguration } from 'src/app/configuration/models/challenge-configuration';
import { ChallengeConfigurationService } from 'src/app/configuration/challenge-configuration.service';
import { Team } from 'src/app/configuration/models/team';
import { TeamService } from 'src/app/configuration/team.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { ChallengeResult } from '../models/challenge-result';
import { ChallengeService } from '../challenge.service';
import { HttpErrorResponse } from '@angular/common/http';
import { sameData } from 'src/app/shared/data-change.utils';

interface ChallengeParticipationRow {
  team: Team;
  result?: ChallengeResult;
}

interface ChallengeParticipationStatus {
  notStarted: ChallengeParticipationRow[];
  inProgress: ChallengeParticipationRow[];
  finished: ChallengeParticipationRow[];
}

@Component({
  selector: 'app-challenge-participation',
  templateUrl: './challenge-participation.component.html',
  styleUrls: ['./challenge-participation.component.scss']
})
export class ChallengeParticipationComponent implements OnInit, OnDestroy {
  challengeConfigurations: ChallengeConfiguration[] = [];
  selectedChallenge?: number;

  teams: Team[] = [];
  statuses: ChallengeParticipationStatus = { notStarted: [], inProgress: [], finished: [] };

  loading = false;
  error?: string;

  private destroy$ = new Subject<void>();

  constructor(
    private challengeConfigurationService: ChallengeConfigurationService,
    private challengeService: ChallengeService,
    private teamService: TeamService,
    private rankingUpdateService: RankingUpdateService,
    private confirmationDialogService: ConfirmationDialogService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initData();
    this.rankingUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshParticipation(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackChallengeConfiguration(_index: number, challenge: ChallengeConfiguration): string | number {
    return challenge.id ?? challenge.challenge;
  }

  trackParticipation(_index: number, row: ChallengeParticipationRow): string | number {
    return row.team.id ?? row.team.team;
  }

  get selectedChallengeLabel(): string {
    const challengeConfiguration = this.challengeConfigurations.find(s => s.challenge === this.selectedChallenge);
    return challengeConfiguration ? challengeConfiguration.name : '';
  }

  async onChallengeChange(challengeValue: string): Promise<void> {
    const parsed = Number(challengeValue);
    this.selectedChallenge = Number.isNaN(parsed) ? undefined : parsed;
    await this.refreshParticipation();
  }

  async startChallenge(row: ChallengeParticipationRow, navigateAfterStart = false): Promise<void> {
    if (!this.selectedChallenge) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Début d\'une épreuve',
        'Démarrer l\'épreuve ' + this.selectedChallenge + '\u00A0?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      this.error = undefined;
      row.result = await firstValueFrom(this.challengeService.beginChallenge(this.selectedChallenge, row.team.team));
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
      if (navigateAfterStart) {
        await this.router.navigate(['/challenge', row.team.team, this.selectedChallenge]);
      }
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de démarrer l\'épreuve pour cette équipe.';
    }
  }

  async openChallenge(row: ChallengeParticipationRow): Promise<void> {
    if (!this.selectedChallenge) {
      return;
    }
    if (!row.result) {
      await this.startChallenge(row, true);
      return;
    }
    try {
      await this.router.navigate(['/challenge', row.team.team, this.selectedChallenge]);
    } catch (error) {
      console.log(error);
      this.error = 'Impossible d\'ouvrir l\'épreuve pour cette équipe.';
    }
  }

  async stopChallenge(row: ChallengeParticipationRow): Promise<void> {
    if (!this.selectedChallenge || !row.result) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Fin d\'une épreuve',
        'Terminer l\'épreuve ' + this.selectedChallenge + '\u00A0?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      const result = await firstValueFrom(this.challengeService.endChallenge(this.selectedChallenge, row.team.team));
      row.result = result;
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de terminer l\'épreuve pour cette équipe.';
    }
  }

  async cancelChallenge(row: ChallengeParticipationRow): Promise<void> {
    if (!this.selectedChallenge || !row.result) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Annulation d\'une épreuve',
        'Annuler l\'épreuve ' + this.selectedChallenge + '\u00A0?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      await firstValueFrom(this.challengeService.cancelChallenge(this.selectedChallenge, row.team.team));
      row.result = undefined;
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible d\'annuler l\'épreuve pour cette équipe.';
    }
  }

  async undoChallenge(row: ChallengeParticipationRow): Promise<void> {
    if (!this.selectedChallenge || !row.result) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Reprise d\'une épreuve',
        'Reprendre l\'épreuve ' + this.selectedChallenge + '\u00A0?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      row.result = await firstValueFrom(this.challengeService.undoChallenge(this.selectedChallenge, row.team.team));
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de reprendre l\'épreuve pour cette équipe.';
    }
  }

  private async initData(): Promise<void> {
    this.loading = true;
    this.error = undefined;
    try {
      const [challengeConfigurationCollection, teamCollection] = await Promise.all([
        firstValueFrom(this.challengeConfigurationService.getChallengeConfigurations()),
        firstValueFrom(this.teamService.getTeams())
      ]);

      this.challengeConfigurations = (challengeConfigurationCollection?._embedded?.challengeConfigurations ?? []).sort((a, b) => a.challenge - b.challenge);
      this.teams = (teamCollection?._embedded?.teams ?? [])
        .sort((a, b) => a.team - b.team);

      if (!this.selectedChallenge && this.challengeConfigurations.length > 0) {
        this.selectedChallenge = this.challengeConfigurations[0].challenge;
      }
    } catch (error) {
      console.log(error);
      this.error = 'Erreur lors du chargement des données.';
    } finally {
      this.loading = false;
    }

    await this.refreshParticipation();
  }

  private async refreshParticipation(silent: boolean = false): Promise<void> {
    if (!this.selectedChallenge) {
      this.statuses = { notStarted: [], inProgress: [], finished: [] };
      return;
    }

    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    try {
      const challengeResultCollection = await firstValueFrom(
        this.challengeService.getChallenges({ challenge: this.selectedChallenge, sortBy: ['team,asc'] })
      );
      const challengeResults = challengeResultCollection?._embedded?.challengeResults ?? [];
      const nextStatuses = this.computeStatuses(challengeResults);
      if (!sameData(this.statuses, nextStatuses)) {
        this.statuses = nextStatuses;
      }
    } catch (error) {
      console.log(error);
      if (!silent) {
        this.error = 'Erreur lors du chargement des participations.';
      }
    } finally {
      if (!silent) {
        this.loading = false;
      }
    }
  }

  private computeStatuses(challengeResults: ChallengeResult[]): ChallengeParticipationStatus {
    const byTeam = new Map<number, ChallengeResult>();
    challengeResults.forEach(result => byTeam.set(result.team, result));

    const notStarted: ChallengeParticipationRow[] = [];
    const inProgress: ChallengeParticipationRow[] = [];
    const finished: ChallengeParticipationRow[] = [];

    for (const team of this.teams) {
      const result = byTeam.get(team.team);
      if (!result?.begin) {
        notStarted.push({ team, result });
      } else if (!result?.end) {
        inProgress.push({ team, result });
      } else {
        finished.push({ team, result });
      }
    }

    return { notStarted, inProgress, finished };
  }

  async startAllNotStarted(): Promise<void> {
    if (!this.selectedChallenge) {
      return;
    }
    const targets = this.statuses.notStarted.filter(row => !row.result?.begin);
    if (targets.length === 0) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Démarrer en masse',
        'Démarrer l\'épreuve ' + this.selectedChallenge + ' pour toutes les équipes non démarrées ?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      this.loading = true;
      this.error = undefined;
      await Promise.all(targets.map(row => firstValueFrom(this.challengeService.beginChallenge(this.selectedChallenge, row.team.team))));
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de démarrer l\'épreuve en masse.';
    } finally {
      this.loading = false;
    }
  }

  async stopAllInProgress(): Promise<void> {
    if (!this.selectedChallenge) {
      return;
    }
    const targets = this.statuses.inProgress.filter(row => row.result?.begin && !row.result?.end);
    if (targets.length === 0) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Terminer en masse',
        'Terminer l\'épreuve ' + this.selectedChallenge + ' pour toutes les équipes en cours ?',
        'Oui', 'Non');
      if (!confirmed) {
        return;
      }
      this.loading = true;
      this.error = undefined;
      await Promise.all(targets.map(row => firstValueFrom(this.challengeService.endChallenge(this.selectedChallenge, row.team.team))));
      this.rankingUpdateService.triggerUpdate();
      await this.refreshParticipation();
    } catch (error) {
      console.log(error);
      this.error = 'Impossible de terminer l\'épreuve en masse.';
    } finally {
      this.loading = false;
    }
  }
}


