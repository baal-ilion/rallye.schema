import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { HalPage } from 'src/app/models/hal-page';
import { ChallengeConfiguration } from 'src/app/configuration/models/challenge-configuration';
import { Team } from 'src/app/configuration/models/team';
import { ChallengeConfigurationService } from 'src/app/configuration/challenge-configuration.service';
import { TeamService } from 'src/app/configuration/team.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { ChallengeCriteria } from '../models/challenge-criteria';
import { ChallengeResult } from '../models/challenge-result';
import { ChallengeService } from '../challenge.service';
import { RankingUpdateService } from 'src/app/services/ranking-update.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { sameData } from 'src/app/shared/data-change.utils';

@Component({
  selector: 'app-list-challenge',
  templateUrl: './list-challenge.component.html',
  styleUrls: ['./list-challenge.component.scss']
})
export class ListChallengeComponent implements OnInit, OnDestroy {
  challenges: ChallengeResult[] = [];
  page = 1;
  pages: HalPage = { size: 0, number: -1, totalElements: 0, totalPages: 1 };
  criteria: ChallengeCriteria = { checked: false, entered: true, finished: true, sortBy: ['challenge,asc', 'team,asc'] };
  filterMode: 'PENDING' | 'VALIDATED' | 'ALL' | 'CUSTOM' = 'PENDING';
  mobileDetailOpen = false;
  loading = false;
  contentZoomPercent = 100;
  selectedChallengeHasSubmittedForms = false;
  teams: Team[] = [];
  challengeConfigurations: ChallengeConfiguration[] = [];
  private configurationLoaded = false;
  private destroy$ = new Subject<void>();

  private readonly SelectedId = 'ListChallengeComponent.selected';
  private readonly CriteriaId = 'ListChallengeComponent.criteria';
  private readonly ZoomId = 'ListChallengeComponent.zoom';

  constructor(
    private challengeService: ChallengeService,
    private teamService: TeamService,
    private challengeConfigurationService: ChallengeConfigurationService,
    private dialogService: DialogService,
    private rankingUpdateService: RankingUpdateService,
    @Inject(DOCUMENT) private document: Document) { }

  ngOnDestroy(): void {
    this.document.documentElement.classList.remove('validation-challenge-page');
    this.document.body.classList.remove('validation-challenge-page');
    sessionStorage.setItem(this.SelectedId, null);
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackChallenge(_index: number, challenge: ChallengeResult): string {
    return challenge.id;
  }

  trackChallengeConfiguration(_index: number, challenge: ChallengeConfiguration): string | number {
    return challenge.id ?? challenge.challenge;
  }

  trackTeam(_index: number, team: Team): string | number {
    return team.id ?? team.team;
  }

  ngOnInit() {
    this.document.documentElement.classList.add('validation-challenge-page');
    this.document.body.classList.add('validation-challenge-page');
    this.criteria = this.restoreCriteria();
    this.contentZoomPercent = this.restoreZoom();
    this.criteria.sortBy = ['challenge,asc', 'team,asc'];
    this.filterMode = this.detectFilterMode();
    this.loadChallenges()
      .then(() => { })
      .catch(error => console.error(error));
    this.rankingUpdateService.updates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshCurrentPage());
  }

  async loadConfiguration() {
    if (!this.configurationLoaded) {
      this.teams = (await this.teamService.getTeams().toPromise())?._embedded?.teams ?? [];
      this.teams.sort((a, b) => (a.team > b.team) ? 1 : -1);
      this.challengeConfigurations = (await this.challengeConfigurationService.getChallengeConfigurations().toPromise())?._embedded?.challengeConfigurations ?? [];
      this.challengeConfigurations.sort((a, b) => (a.challenge > b.challenge) ? 1 : -1);
      this.configurationLoaded = true;
    }
  }

  async loadChallenges() {
    this.loading = true;
    this.challenges = [];
    this.page = 1;
    this.pages = { size: 0, number: -1, totalElements: 0, totalPages: 1 };
    // Load configuration
    try {
      await this.loadConfiguration();
      // load first page
      await this.loadPages(this.page);
      // load others pages
      await this.loadPages(this.pages.totalElements);
      this.sortChallenges();
      // select last selected item
      const lastSelected = sessionStorage.getItem(this.SelectedId);
      const index = this.challenges.findIndex(f => f.id === lastSelected);
      if (index !== -1) {
        this.page = index + 1;
        this.loadPage(this.page);
      }
    } finally {
      this.loading = false;
    }
  }

  async loadPages(page: number) {
    if (page > this.challenges.length) {
      const pageNumber = this.pages.number + 1;
      if (pageNumber < this.pages.totalPages) {
        const challenges = await this.challengeService.getChallenges(this.criteria).toPromise();
        console.log(challenges);
        this.pages = challenges.page ?
          challenges.page :
          { size: 0, number: 0, totalElements: challenges._embedded?.challengeResults?.length ?? 0, totalPages: 1 };
        console.log(this.pages);
        this.challenges = this.challenges.concat(challenges._embedded?.challengeResults ?? []);
        await this.loadPages(page);
      }
    }
  }

  loadPage(page: number) {
    this.selectedChallengeHasSubmittedForms = false;
    this.loadPages(page);
    const selected = this.challenges[page - 1];
    if (selected?.id) {
      sessionStorage.setItem(this.SelectedId, selected.id);
    }
  }

  onSubmittedFormsVisibilityChange(visible: boolean): void {
    this.selectedChallengeHasSubmittedForms = visible;
  }

  zoomOut(): void {
    this.contentZoomPercent = Math.max(20, this.contentZoomPercent - 10);
    this.saveZoom();
  }

  zoomIn(): void {
    this.contentZoomPercent = Math.min(150, this.contentZoomPercent + 10);
    this.saveZoom();
  }

  resetZoom(): void {
    this.contentZoomPercent = 100;
    this.saveZoom();
  }

  get selectedChallenge(): ChallengeResult | undefined {
    return this.page > 0 ? this.challenges[this.page - 1] : undefined;
  }

  get activeFilterLabel(): string {
    switch (this.filterMode) {
      case 'PENDING': return 'À valider';
      case 'VALIDATED': return 'Validées';
      case 'ALL': return 'Toutes les épreuves';
      default: return 'Filtres personnalisés';
    }
  }

  selectChallenge(index: number): void {
    if (index < 0 || index >= this.challenges.length) {
      return;
    }
    this.page = index + 1;
    this.loadPage(this.page);
    this.mobileDetailOpen = true;
  }

  teamLabel(team: number): string {
    return this.teams.find(item => item.team === team)?.name || `Équipe ${team}`;
  }

  challengeLabel(challenge: number): string {
    return this.challengeConfigurations.find(item => item.challenge === challenge)?.name || `Épreuve ${challenge}`;
  }

  applyCustomCriteria(event: Event): void {
    this.filterMode = this.detectFilterMode();
    if (this.filterMode === 'ALL' && (this.criteria.team || this.criteria.challenge)) {
      this.filterMode = 'CUSTOM';
    }
    this.changeCriteria(event);
  }

  resetFilters(): void {
    this.criteria = { checked: false, entered: true, finished: true, sortBy: ['challenge,asc', 'team,asc'] };
    this.filterMode = 'PENDING';
    this.changeCriteria(null);
  }

  private detectFilterMode(): 'PENDING' | 'VALIDATED' | 'ALL' | 'CUSTOM' {
    const hasEntityFilter = !!this.criteria.team || !!this.criteria.challenge;
    if (!hasEntityFilter && this.criteria.checked === false && this.criteria.entered === true && this.criteria.finished === true) {
      return 'PENDING';
    }
    if (!hasEntityFilter && this.criteria.checked === true && this.criteria.entered == null && this.criteria.finished == null) {
      return 'VALIDATED';
    }
    if (!hasEntityFilter && this.criteria.checked == null && this.criteria.entered == null && this.criteria.finished == null) {
      return 'ALL';
    }
    return 'CUSTOM';
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    const element = event.target as HTMLElement;
    if (!this.dialogService.hasOpenDialogs() && element.tagName !== 'INPUT') {
      if (event.key === 'ArrowRight') {
        this.next();
      }
      if (event.key === 'ArrowLeft') {
        this.previous();
      }
    }
  }

  next() {
    if (this.page < this.challenges.length) {
      this.page++;
      this.loadPage(this.page);
    }
  }

  previous() {
    if (this.page > 1) {
      this.page--;
      this.loadPage(this.page);
    }
  }

  nextChecked(checked: boolean) {
    if (checked === false)
      return null;
    return !checked;
  }

  changeCriteria(event: Event) {
    console.log(this.criteria);
    this.saveCriteria();
    this.loadChallenges();
  }

  private restoreCriteria(): ChallengeCriteria {
    const defaultCriteria: ChallengeCriteria = { checked: false, entered: true, finished: true };
    try {
      const storedCriteria = localStorage.getItem(this.CriteriaId);
      return storedCriteria ? { ...defaultCriteria, ...JSON.parse(storedCriteria) } : defaultCriteria;
    } catch (error) {
      console.warn('Impossible de restaurer les filtres de validation.', error);
      return defaultCriteria;
    }
  }

  private saveCriteria(): void {
    try {
      const { challenge, team, checked, entered, finished } = this.criteria;
      localStorage.setItem(this.CriteriaId, JSON.stringify({ challenge, team, checked, entered, finished }));
    } catch (error) {
      console.warn('Impossible de mémoriser les filtres de validation.', error);
    }
  }

  private restoreZoom(): number {
    try {
      const storedValue = localStorage.getItem(this.ZoomId);
      if (storedValue === null) {
        return 100;
      }
      const storedZoom = Number(storedValue);
      if (!Number.isFinite(storedZoom) || storedZoom < 20 || storedZoom > 150) {
        return 100;
      }
      return Math.round(storedZoom / 10) * 10;
    } catch (error) {
      console.warn('Impossible de restaurer le zoom de validation.', error);
      return 100;
    }
  }

  private saveZoom(): void {
    try {
      localStorage.setItem(this.ZoomId, String(this.contentZoomPercent));
    } catch (error) {
      console.warn('Impossible de mémoriser le zoom de validation.', error);
    }
  }

  onChallengeUpdated() {
    this.loadChallenges();
  }

  private async refreshCurrentPage(): Promise<void> {
    const currentId = this.challenges?.[this.page - 1]?.id || sessionStorage.getItem(this.SelectedId);
    await this.loadConfiguration();
    try {
      const challenges = await this.challengeService.getChallenges(this.criteria).toPromise();
      const results = challenges._embedded?.challengeResults ?? [];
      const nextPages = challenges.page ?
        challenges.page :
        { size: results.length, number: 0, totalElements: results.length, totalPages: 1 };
      const nextChallenges = [...results].sort((left, right) => left.challenge - right.challenge || left.team - right.team);
      if (sameData(this.pages, nextPages) && sameData(this.challenges, nextChallenges)) {
        return;
      }
      this.pages = nextPages;
      this.challenges = nextChallenges;
      const index = currentId ? this.challenges.findIndex(s => s.id === currentId) : -1;
      if (index !== -1) {
        this.page = index + 1;
      } else if (this.page > this.challenges.length) {
        this.page = this.challenges.length > 0 ? this.challenges.length : 0;
      }
      if (this.page > 0 && this.challenges[this.page - 1]) {
        sessionStorage.setItem(this.SelectedId, this.challenges[this.page - 1].id);
      }
    } catch (error) {
      console.log(error);
    }
  }

  private sortChallenges(): void {
    this.challenges.sort((left, right) => left.challenge - right.challenge || left.team - right.team);
  }
}
