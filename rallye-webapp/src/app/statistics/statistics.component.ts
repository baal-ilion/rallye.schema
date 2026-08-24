import { Component, OnDestroy, OnInit } from '@angular/core';
import { merge, Subject } from 'rxjs';
import { auditTime, filter, takeUntil } from 'rxjs/operators';
import { RankingUpdateService } from '../services/ranking-update.service';
import { TeamUpdateService } from '../services/team-update.service';
import { ApplicationUpdateService } from '../services/application-update.service';
import { StatisticsService } from './statistics.service';
import { StatisticsResponse, ChallengeQuestionRate, ChallengeHeatmapBucket, ChallengeGroupStatistics, ChallengeStatistics } from './statistics.types';
import { sameData } from '../shared/data-change.utils';

type QuestionSegmentKey = 'min' | 'avg' | 'max';

interface QuestionSegment {
  key: QuestionSegmentKey;
  value: number;
  bgClass: string;
}

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit, OnDestroy {
  data?: StatisticsResponse;
  loading = false;
  error?: string;
  private destroy$ = new Subject<void>();
  private challengeDigitCount = 1;
  private teamDigitCount = 1;
  private popularityMax = 1;
  private groupPopularityMax = 1;
  private timelineMax = 1;
  private questionMax = 1;
  private questionSuccessMax = 1;
  private durationMax = 1;
  private performanceMax = 1;
  private groupDurationMaxCache = new Map<string, number>();

  constructor(private statisticsService: StatisticsService, private rankingUpdates: RankingUpdateService,
    private teamUpdates: TeamUpdateService, private applicationUpdates: ApplicationUpdateService) {}

  ngOnInit(): void {
    this.fetch();
    merge(
      this.rankingUpdates.updates$,
      this.teamUpdates.updates$,
      this.applicationUpdates.updates$.pipe(filter(update =>
        update.domain === 'CONFIGURATION' || update.domain === 'DATABASE' || update.domain === 'RESYNC'))
    ).pipe(auditTime(150), takeUntil(this.destroy$)).subscribe(() => this.fetch(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetch(silent = false): void {
    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    this.statisticsService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          const nextData: StatisticsResponse = {
            overview: resp.overview ?? {
              totalTeams: 0,
              totalChallenges: 0,
              totalParticipation: 0,
              inProgress: 0,
              finished: 0,
              notStarted: 0,
              totalDurationMinutes: 0,
              averageDurationMinutes: 0
            },
            challenges: resp.challenges ?? [],
            teams: resp.teams ?? [],
            popularity: resp.popularity ?? [],
            groupPopularity: resp.groupPopularity ?? [],
            timeline: resp.timeline ?? [],
            questions: resp.questions ?? [],
            activity: resp.activity ?? [],
            challengeHeatmap: resp.challengeHeatmap ?? [],
            challengeHeatmapTimeline: resp.challengeHeatmapTimeline ?? [],
            challengeGroups: resp.challengeGroups ?? []
          };
          if (!sameData(this.data, nextData)) {
            this.data = nextData;
            this.computeMaxima();
            this.updateDigitCounts();
            this.updateGroupDurationMaxes();
          }
          if (!silent) {
            this.loading = false;
          }
        },
        error: (err) => {
          console.log(err);
          if (!silent) {
            this.error = 'Impossible de charger les statistiques.';
            this.loading = false;
          }
        }
      });
  }

  formatMinutes(value: number | undefined): string {
    if (value === undefined || value === null) {
      return '-';
    }
    const minutes = Math.round(value);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  }

  private computeMaxima(): void {
    if (!this.data) {
      return;
    }
    const challenges = this.data.challenges || [];
    const popularity = this.data.popularity || [];
    const timeline = this.data.timeline || [];
    this.popularityMax = Math.max(...popularity.map(p => p.participations || 0), 1);
    this.timelineMax = Math.max(...timeline.map(t => t.averageDurationMinutes || 0), 1);
    const groupPop = this.data.groupPopularity || [];
    this.groupPopularityMax = Math.max(...groupPop.map(g => g.participations || 0), 1);
    this.durationMax = Math.max(...challenges.map(s => s.maxDurationMinutes || 0), 1);
    this.performanceMax = Math.max(...challenges.map(s => s.maxPerformanceValue || 0), 1);
    const questionRates: ChallengeQuestionRate[] = (this.data.questions || []).reduce((acc, q) => {
      if (q.questions) {
        return acc.concat(q.questions);
      }
      return acc;
    }, [] as ChallengeQuestionRate[]);
    this.questionMax = Math.max(...questionRates.map(q => q.successRate || 0), 1);
    this.questionSuccessMax = Math.max(...challenges.map(s => s.maxQuestionSuccess || 0), 1);
  }

  private updateDigitCounts(): void {
    if (!this.data) {
      this.challengeDigitCount = 1;
      this.teamDigitCount = 1;
      return;
    }
    const challengeNumbers = (this.data.challenges || []).map(s => s.challenge || 0);
    const maxChallenge = challengeNumbers.length ? Math.max(...challengeNumbers) : 0;
    this.challengeDigitCount = Math.max(1, maxChallenge.toString().length);
    const teamNumbers = (this.data.teams || []).map(t => t.team || 0);
    const maxTeam = teamNumbers.length ? Math.max(...teamNumbers) : 0;
    this.teamDigitCount = Math.max(1, maxTeam.toString().length);
  }

  private padNumber(value: number | undefined, digits: number): string {
    if (value === undefined || value === null) {
      return '0'.repeat(digits);
    }
    return value.toString().padStart(digits, '0');
  }

  formatChallengeNumber(value: number | undefined): string {
    return this.padNumber(value, this.challengeDigitCount);
  }

  formatTeamNumber(value: number | undefined): string {
    return this.padNumber(value, this.teamDigitCount);
  }

  private updateGroupDurationMaxes(): void {
    this.groupDurationMaxCache.clear();
    if (!this.data || !this.data.challengeGroups) {
      return;
    }
    this.data.challengeGroups.forEach(group => {
      const maxValue = group.challenges?.length
        ? Math.max(...group.challenges.map(challenge => challenge.maxDurationMinutes || 0))
        : 0;
      this.groupDurationMaxCache.set(this.groupCacheKey(group), Math.max(maxValue, 1));
    });
  }

  groupDurationMax(group: ChallengeGroupStatistics): number {
    if (!group) {
      return 1;
    }
    const key = this.groupCacheKey(group);
    if (this.groupDurationMaxCache.has(key)) {
      return this.groupDurationMaxCache.get(key)!;
    }
    const maxValue = group.challenges?.length
      ? Math.max(...group.challenges.map(challenge => challenge.maxDurationMinutes || 0))
      : 0;
    const finalValue = Math.max(maxValue, 1);
    this.groupDurationMaxCache.set(key, finalValue);
    return finalValue;
  }

  private groupCacheKey(group: ChallengeGroupStatistics): string {
    return group.groupId ?? group.name ?? '__group__';
  }

  barWidth(value: number | undefined, max: number): string {
    if (!value || value <= 0 || max <= 0) {
      return '0%';
    }
    return `${Math.round((value / max) * 100)}%`;
  }

  segmentWidth(value: number | undefined, base: number | undefined): number {
    const diff = (value || 0) - (base || 0);
    return diff > 0 ? diff : 0;
  }

  challengeHeatmapMax(buckets: ChallengeHeatmapBucket[] | undefined): number {
    if (!buckets || buckets.length === 0) {
      return 1;
    }
    return Math.max(...buckets.map(b => (b?.active || 0)), 1);
  }

  heatmapColor(value: number, max: number): string {
    if (max <= 0) {
      return '#f1f3f5';
    }
    const ratio = Math.min(1, value / max);
    const lightness = Math.max(30, 92 - ratio * 60);
    return `hsl(206, 82%, ${lightness}%)`;
  }

  heatmapTextColor(value: number, max: number): string {
    return max > 0 && value / max > 0.5 ? '#fff' : '#111';
  }

  get popularityMaxValue(): number {
    return this.popularityMax;
  }

  get groupPopularityMaxValue(): number {
    return this.groupPopularityMax;
  }

  get timelineMaxValue(): number {
    return this.timelineMax;
  }

  get questionMaxValue(): number {
    return this.questionMax;
  }

  get questionSuccessMaxValue(): number {
    return this.questionSuccessMax;
  }

  challengeQuestionMax(challenge: ChallengeStatistics): number {
    const totalQuestions = challenge?.questionCount || 0;
    return Math.max(totalQuestions, 1);
  }

  challengePerformanceMax(challenge: ChallengeStatistics): number {
    return Math.max(challenge?.maxPerformanceValue || 0, 1);
  }

  hasQuestionSuccess(challenge: ChallengeStatistics): boolean {
    return !!((challenge?.maxQuestionSuccess || 0) > 0);
  }

  questionSegments(challenge: ChallengeStatistics): QuestionSegment[] {
    if (!challenge || !this.hasQuestionSuccess(challenge)) {
      return [];
    }
    const min = challenge.minQuestionSuccess || 0;
    const avg = challenge.averageQuestionSuccess || 0;
    const max = challenge.maxQuestionSuccess || 0;
    const segments: QuestionSegment[] = [
      { key: 'max', value: max, bgClass: 'bg-success' },
      { key: 'avg', value: avg, bgClass: 'bg-info' },
      { key: 'min', value: min, bgClass: 'bg-secondary' },
    ];
    return segments.sort((a, b) => {
      const valueCompare = b.value - a.value;
      if (valueCompare !== 0) {
        return valueCompare;
      }
      return this.questionSegmentPriority(a.key) - this.questionSegmentPriority(b.key);
    });
  }

  get durationMaxValue(): number {
    return this.durationMax;
  }

  get performanceMaxValue(): number {
    return this.performanceMax;
  }

  get hasPerformance(): boolean {
    return !!this.data?.challenges?.some(s => s.minPerformanceValue !== undefined && s.minPerformanceValue !== null);
  }

  hasPerformanceForChallenge(challenge: any): boolean {
    return challenge?.minPerformanceValue !== undefined && challenge.minPerformanceValue !== null;
  }

  hasQuestionsForChallenge(challenge: any): boolean {
    return (challenge?.totalQuestionAnswers || 0) > 0;
  }

  hasQuestionsForGroup(group: ChallengeGroupStatistics): boolean {
    return !!group?.challenges?.some(challenge => this.hasQuestionsForChallenge(challenge));
  }

  hasPerformanceForGroup(group: ChallengeGroupStatistics): boolean {
    return !!group?.challenges?.some(challenge => this.hasPerformanceForChallenge(challenge));
  }

  get hasQuestions(): boolean {
    return !!this.data?.challenges?.some(s => this.hasQuestionsForChallenge(s));
  }

  private questionSegmentPriority(key: QuestionSegmentKey): number {
    switch (key) {
      case 'max':
        return 0;
      case 'avg':
        return 1;
      default:
        return 2;
    }
  }
}
