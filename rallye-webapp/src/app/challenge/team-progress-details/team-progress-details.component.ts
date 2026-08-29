import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { auditTime, filter, takeUntil } from 'rxjs/operators';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { ChallengeConfiguration } from 'src/app/configuration/models/challenge-configuration';
import { Team } from 'src/app/configuration/models/team';
import { ChallengeConfigurationService } from 'src/app/configuration/challenge-configuration.service';
import { TeamService } from 'src/app/configuration/team.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { ChallengeResult } from '../models/challenge-result';
import { ChallengeService } from '../challenge.service';
import { Router } from '@angular/router';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';

@Component({
  selector: 'app-team-progress-details',
  templateUrl: './team-progress-details.component.html',
  styleUrls: ['./team-progress-details.component.scss']
})
export class TeamProgressDetailsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() teamId?: string;
  @Input() navigateOnStart = false;
  @Input() challengeFilter?: number;

  team: Team;
  challengeConfigurations: ChallengeConfiguration[] = [];
  challenges: { [challenge: number]: ChallengeResult } = {};
  loading = false;
  error?: string;
  challengeCardMinWidthPx = 248;
  private destroy$ = new Subject<void>();
  private ignoreNextUpdate = false;

  constructor(
    private teamService: TeamService,
    private challengeConfigurationService: ChallengeConfigurationService,
    private challengeService: ChallengeService,
    private confirmationDialogService: ConfirmationDialogService,
    private rankingUpdateService: RankingUpdateService,
    private applicationUpdates: ApplicationUpdateService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.init();
    this.loadChallengeConfigurations();

    this.rankingUpdateService.updates$
      .pipe(
        auditTime(200),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.ignoreNextUpdate) {
          this.ignoreNextUpdate = false;
          return;
        }
        this.refreshTeamData();
      });
    this.applicationUpdates.updates$.pipe(
      filter(update => update.domain === 'CONFIGURATION' || update.domain === 'DATABASE'),
      auditTime(150), takeUntil(this.destroy$)
    ).subscribe(async () => {
      await this.loadChallengeConfigurations();
      await this.refreshTeamData();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.teamId && !changes.teamId.isFirstChange()) {
      this.init();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async init() {
    await this.refreshTeamData();
  }

  private async refreshTeamData() {
    if (!this.teamId) {
      this.team = null;
      this.challenges = {};
      return;
    }
    await this.loadTeam(this.teamId);
  }

  private async loadTeam(id: string) {
    const previousTeam = this.team?.team;
    try {
      this.team = await this.teamService.findById(id).toPromise();
      if (this.team?.team !== previousTeam) {
        this.challenges = {};
      }
    } catch (error) {
      this.team = null;
      this.challenges = {};
      this.error = 'Erreur lors du chargement de l\'équipe.';
    }
    if (this.team?.team) {
      await this.loadChallenges(this.team.team);
    }
  }

  private async loadChallenges(team: number) {
    try {
      const challenges = await this.challengeService.getChallengesByTeam(team).toPromise();
      const challengeResults = challenges._embedded.challengeResults;
      const incomingChallenges = challengeResults ?? [];

      const incomingKeys = new Set(incomingChallenges.map(s => s.challenge));
      Object.keys(this.challenges).forEach(k => {
        const key = Number(k);
        if (!incomingKeys.has(key)) {
          delete this.challenges[key];
        }
      });

      for (const challenge of incomingChallenges) {
        this.challenges[challenge.challenge] = challenge;
      }
    } catch (error) {
      this.challenges = {};
    }
  }

  private async loadChallengeConfigurations() {
    try {
      const challengeConfigurations = (await this.challengeConfigurationService.getChallengeConfigurations().toPromise())?._embedded?.challengeConfigurations ?? [];
      challengeConfigurations.sort((a, b) => (a.challenge > b.challenge) ? 1 : -1);
      this.challengeConfigurations = challengeConfigurations;
      this.updateChallengeCardMinWidth();
    } catch (error) {
      this.challengeConfigurations = [];
    }
  }

  get challengeConfigurationsToDisplay(): ChallengeConfiguration[] {
    if (this.challengeFilter === undefined) {
      return this.challengeConfigurations;
    }
    const filter = Number(this.challengeFilter);
    if (!Number.isFinite(filter)) {
      return this.challengeConfigurations;
    }
    return this.challengeConfigurations.filter(s => s.challenge === filter);
  }

  private updateChallengeCardMinWidth(): void {
    const titles = this.challengeConfigurations
      .map(configuration => configuration.name ?? '')
      .filter(title => title.length > 0);
    if (titles.length === 0 || typeof document === 'undefined') {
      this.challengeCardMinWidthPx = 248;
      return;
    }

    const probe = document.createElement('span');
    const bodyStyle = window.getComputedStyle(document.body);
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'nowrap';
    probe.style.fontFamily = bodyStyle.fontFamily;
    probe.style.fontSize = '1rem';
    probe.style.fontWeight = '700';
    document.body.appendChild(probe);

    const longestTitleWidth = titles.reduce((width, title) => {
      probe.textContent = title;
      return Math.max(width, probe.getBoundingClientRect().width);
    }, 0);
    probe.remove();

    // 248 px permettent au pied le plus chargé de conserver ses trois boutons sur une ligne.
    // Les 32 px supplémentaires correspondent aux espacements horizontaux de l'en-tête.
    this.challengeCardMinWidthPx = Math.max(248, Math.ceil(longestTitleWidth + 32));
  }

  onStartChallenge(challenge: number) {
    this.confirmationDialogService.confirm(
      'Début d\'une épreuve',
      'Démarrer l\'épreuve ' + challenge + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.challengeService.beginChallenge(challenge, this.team.team).subscribe(result => {
            if (result) { this.challenges[challenge] = result; }
            this.ignoreNextUpdate = true;
            this.rankingUpdateService.triggerUpdate();
            if (this.navigateOnStart) {
              this.router.navigate(["/challenge", this.team.team, challenge]).catch(() => { });
            }
          });
        }
      })
      .catch(() => { });
  }

  onStopChallenge(challenge: number) {
    this.confirmationDialogService.confirm(
      'Fin d\'une épreuve',
      'Terminer l\'épreuve ' + challenge + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.challengeService.endChallenge(challenge, this.team.team).subscribe(result => {
            if (result) { this.challenges[challenge] = result; }
            this.ignoreNextUpdate = true;
            this.rankingUpdateService.triggerUpdate();
            if (this.navigateOnStart) {
              this.router.navigate(["/challenge", this.team.team, challenge]).catch(() => { });
            }
          });
        }
      })
      .catch(() => { });
  }

  onCancelChallenge(challenge: number) {
    this.confirmationDialogService.confirm(
      'Annulation d\'une épreuve',
      'Annuler l\'épreuve ' + challenge + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.challengeService.cancelChallenge(challenge, this.team.team).subscribe(() => {
            delete this.challenges[challenge];
            this.ignoreNextUpdate = true;
            this.rankingUpdateService.triggerUpdate();
          });
        }
      })
      .catch(() => { });
  }

  onUndoChallenge(challenge: number) {
    this.confirmationDialogService.confirm(
      'Reprise d\'une épreuve',
      'Reprendre l\'épreuve ' + challenge + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.challengeService.undoChallenge(challenge, this.team.team).subscribe(result => {
            if (result) { this.challenges[challenge] = result; }
            this.ignoreNextUpdate = true;
            this.rankingUpdateService.triggerUpdate();
            if (this.navigateOnStart) {
              this.router.navigate(["/challenge", this.team.team, challenge]).catch(() => { });
            }
          });
        }
      })
      .catch(() => { });
  }
}


