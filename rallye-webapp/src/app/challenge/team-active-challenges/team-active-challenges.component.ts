import { Component, OnDestroy, OnInit } from '@angular/core';
import { ChallengeService } from '../challenge.service';
import { ChallengeConfigurationService } from 'src/app/configuration/challenge-configuration.service';
import { TeamService } from 'src/app/configuration/team.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { sameData } from 'src/app/shared/data-change.utils';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChallengeResult } from '../models/challenge-result';
import { ChallengeConfiguration } from 'src/app/configuration/models/challenge-configuration';
import { Team } from 'src/app/configuration/models/team';

interface ActiveChallengeRow {
  team: Team;
  challengeResults: ChallengeResult[];
  challengeNames: string[];
}

@Component({
  selector: 'app-team-active-challenges',
  templateUrl: './team-active-challenges.component.html',
  styleUrls: ['./team-active-challenges.component.scss']
})
export class TeamActiveChallengesComponent implements OnInit, OnDestroy {
  rows: ActiveChallengeRow[] = [];
  teams: Team[] = [];
  loading = false;
  error?: string;

  private destroy$ = new Subject<void>();

  constructor(
    private challengeService: ChallengeService,
    private challengeConfigurationService: ChallengeConfigurationService,
    private teamService: TeamService,
    private rankingUpdateService: RankingUpdateService
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.rankingUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackTeamRow(_index: number, row: ActiveChallengeRow): string | number {
    return row.team.id ?? row.team.team;
  }

  trackChallenge(_index: number, challenge: ChallengeResult): string {
    return challenge.id;
  }

  private async loadData(silent = false): Promise<void> {
    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    try {
      const [challengeResultCollection, challengeConfigurationCollection, teamCollection] = await Promise.all([
        firstValueFrom(this.challengeService.getChallenges({ finished: false, sortBy: ['team,asc'] })),
        firstValueFrom(this.challengeConfigurationService.getChallengeConfigurations()),
        firstValueFrom(this.teamService.getTeams())
      ]);

      const challengeConfigurations: ChallengeConfiguration[] = challengeConfigurationCollection?._embedded?.challengeConfigurations ?? [];
      const challengeConfigurationMap = new Map<number, string>(challengeConfigurations.map(s => [s.challenge, s.name]));

      const nextTeams = (teamCollection?._embedded?.teams ?? [])
        .sort((a, b) => a.team - b.team);

      const challengeResults: ChallengeResult[] = (challengeResultCollection?._embedded?.challengeResults ?? [])
        .filter(r => r.begin && !r.end);

      const inProgressByTeam = new Map<number, ChallengeResult[]>();
      challengeResults.forEach(result => {
        if (result.begin && !result.end) {
          const list = inProgressByTeam.get(result.team) ?? [];
          list.push(result);
          inProgressByTeam.set(result.team, list);
        }
      });

      const nextRows = nextTeams.map(team => {
        const teamResults = inProgressByTeam.get(team.team) ?? [];
        return {
          team,
          challengeResults: teamResults,
          challengeNames: teamResults.map(r => challengeConfigurationMap.get(r.challenge) || `Épreuve ${r.challenge}`)
        };
      });
      if (!sameData(this.teams, nextTeams) || !sameData(this.rows, nextRows)) {
        this.teams = nextTeams;
        this.rows = nextRows;
      }
    } catch (err) {
      console.log(err);
      this.error = 'Erreur lors du chargement des épreuves en cours.';
    } finally {
      if (!silent) {
        this.loading = false;
      }
    }
  }
}
