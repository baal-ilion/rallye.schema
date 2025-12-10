import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StatsService } from './stats.service';
import { StatsResponse, StageQuestionRate, StageHeatmapBucket, StageGroupStats, StageStat } from './stats.types';

type QuestionSegmentKey = 'min' | 'avg' | 'max';

interface QuestionSegment {
  key: QuestionSegmentKey;
  value: number;
  bgClass: string;
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements OnInit, OnDestroy {
  data?: StatsResponse;
  loading = false;
  error?: string;
  private destroy$ = new Subject<void>();
  private stageDigitCount = 1;
  private teamDigitCount = 1;
  private popularityMax = 1;
  private groupPopularityMax = 1;
  private timelineMax = 1;
  private questionMax = 1;
  private questionSuccessMax = 1;
  private durationMax = 1;
  private performanceMax = 1;
  private groupDurationMaxCache = new Map<string, number>();

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.fetch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetch(): void {
    this.loading = true;
    this.error = undefined;
    this.statsService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.data = {
            overview: resp.overview ?? {
              totalTeams: 0,
              totalStages: 0,
              totalParticipation: 0,
              inProgress: 0,
              finished: 0,
              notStarted: 0,
              totalDurationMinutes: 0,
              averageDurationMinutes: 0
            },
            stages: resp.stages ?? [],
            teams: resp.teams ?? [],
            popularity: resp.popularity ?? [],
            groupPopularity: resp.groupPopularity ?? [],
            timeline: resp.timeline ?? [],
            questions: resp.questions ?? [],
            activity: resp.activity ?? [],
            stageHeatmap: resp.stageHeatmap ?? [],
            stageHeatmapTimeline: resp.stageHeatmapTimeline ?? [],
            stageGroups: resp.stageGroups ?? []
        };
          this.computeMaxima();
          this.updateDigitCounts();
          this.updateGroupDurationMaxes();
          this.loading = false;
        },
        error: (err) => {
          console.log(err);
          this.error = 'Impossible de charger les statistiques.';
          this.loading = false;
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
    const stages = this.data.stages || [];
    const popularity = this.data.popularity || [];
    const timeline = this.data.timeline || [];
    this.popularityMax = Math.max(...popularity.map(p => p.participations || 0), 1);
    this.timelineMax = Math.max(...timeline.map(t => t.averageDurationMinutes || 0), 1);
    const groupPop = this.data.groupPopularity || [];
    this.groupPopularityMax = Math.max(...groupPop.map(g => g.participations || 0), 1);
    this.durationMax = Math.max(...stages.map(s => s.maxDurationMinutes || 0), 1);
    this.performanceMax = Math.max(...stages.map(s => s.maxPerformanceValue || 0), 1);
    const questionRates: StageQuestionRate[] = (this.data.questions || []).reduce((acc, q) => {
      if (q.questions) {
        return acc.concat(q.questions);
      }
      return acc;
    }, [] as StageQuestionRate[]);
    this.questionMax = Math.max(...questionRates.map(q => q.successRate || 0), 1);
    this.questionSuccessMax = Math.max(...stages.map(s => s.maxQuestionSuccess || 0), 1);
  }

  private updateDigitCounts(): void {
    if (!this.data) {
      this.stageDigitCount = 1;
      this.teamDigitCount = 1;
      return;
    }
    const stageNumbers = (this.data.stages || []).map(s => s.stage || 0);
    const maxStage = stageNumbers.length ? Math.max(...stageNumbers) : 0;
    this.stageDigitCount = Math.max(1, maxStage.toString().length);
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

  formatStageNumber(value: number | undefined): string {
    return this.padNumber(value, this.stageDigitCount);
  }

  formatTeamNumber(value: number | undefined): string {
    return this.padNumber(value, this.teamDigitCount);
  }

  private updateGroupDurationMaxes(): void {
    this.groupDurationMaxCache.clear();
    if (!this.data || !this.data.stageGroups) {
      return;
    }
    this.data.stageGroups.forEach(group => {
      const maxValue = group.stages?.length
        ? Math.max(...group.stages.map(stage => stage.maxDurationMinutes || 0))
        : 0;
      this.groupDurationMaxCache.set(this.groupCacheKey(group), Math.max(maxValue, 1));
    });
  }

  groupDurationMax(group: StageGroupStats): number {
    if (!group) {
      return 1;
    }
    const key = this.groupCacheKey(group);
    if (this.groupDurationMaxCache.has(key)) {
      return this.groupDurationMaxCache.get(key)!;
    }
    const maxValue = group.stages?.length
      ? Math.max(...group.stages.map(stage => stage.maxDurationMinutes || 0))
      : 0;
    const finalValue = Math.max(maxValue, 1);
    this.groupDurationMaxCache.set(key, finalValue);
    return finalValue;
  }

  private groupCacheKey(group: StageGroupStats): string {
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

  stageHeatmapMax(buckets: StageHeatmapBucket[] | undefined): number {
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

  stageQuestionMax(stage: StageStat): number {
    const totalQuestions = stage?.questionCount || 0;
    return Math.max(totalQuestions, 1);
  }

  stagePerformanceMax(stage: StageStat): number {
    return Math.max(stage?.maxPerformanceValue || 0, 1);
  }

  hasQuestionSuccess(stage: StageStat): boolean {
    return !!((stage?.maxQuestionSuccess || 0) > 0);
  }

  questionSegments(stage: StageStat): QuestionSegment[] {
    if (!stage || !this.hasQuestionSuccess(stage)) {
      return [];
    }
    const min = stage.minQuestionSuccess || 0;
    const avg = stage.averageQuestionSuccess || 0;
    const max = stage.maxQuestionSuccess || 0;
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
    return !!this.data?.stages?.some(s => s.minPerformanceValue !== undefined && s.minPerformanceValue !== null);
  }

  hasPerformanceForStage(stage: any): boolean {
    return stage?.minPerformanceValue !== undefined && stage.minPerformanceValue !== null;
  }

  hasQuestionsForStage(stage: any): boolean {
    return (stage?.totalQuestionAnswers || 0) > 0;
  }

  hasQuestionsForGroup(group: StageGroupStats): boolean {
    return !!group?.stages?.some(stage => this.hasQuestionsForStage(stage));
  }

  hasPerformanceForGroup(group: StageGroupStats): boolean {
    return !!group?.stages?.some(stage => this.hasPerformanceForStage(stage));
  }

  get hasQuestions(): boolean {
    return !!this.data?.stages?.some(s => this.hasQuestionsForStage(s));
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
