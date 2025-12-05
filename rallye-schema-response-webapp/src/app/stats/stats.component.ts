import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StatsService } from './stats.service';
import { StatsResponse, StageQuestionRate } from './stats.types';

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
  private stageMax = 1;
  private popularityMax = 1;
  private groupPopularityMax = 1;
  private timelineMax = 1;
  private questionMax = 1;
  private questionSuccessMax = 1;
  private activityMax = 1;
  private durationMax = 1;
  private scoreMax = 100;
  private performanceMax = 1;
  private peakMax = 1;

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
            activity: resp.activity ?? []
          };
          this.computeMaxima();
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
    this.stageMax = Math.max(...stages.map(s => s.participants || 0), 1);
    this.popularityMax = Math.max(...popularity.map(p => p.participations || 0), 1);
    this.timelineMax = Math.max(...timeline.map(t => t.averageDurationMinutes || 0), 1);
    const groupPop = this.data.groupPopularity || [];
    this.groupPopularityMax = Math.max(...groupPop.map(g => g.participations || 0), 1);
    this.durationMax = Math.max(...stages.map(s => s.maxDurationMinutes || 0), 1);
    this.scoreMax = Math.max(...stages.map(s => s.maxScorePercent || 0), 100);
    this.performanceMax = Math.max(...stages.map(s => s.maxPerformanceValue || 0), 1);
    this.peakMax = Math.max(...stages.map(s => s.peakActivityCount || 0), 1);
    const questionRates: StageQuestionRate[] = (this.data.questions || []).reduce((acc, q) => {
      if (q.questions) {
        return acc.concat(q.questions);
      }
      return acc;
    }, [] as StageQuestionRate[]);
    this.questionMax = Math.max(...questionRates.map(q => q.successRate || 0), 1);
    this.questionSuccessMax = Math.max(...stages.map(s => s.maxQuestionSuccess || 0), 1);
    this.activityMax = Math.max(...(this.data.activity || []).map(a => a.active || 0), 1);
  }

  barWidth(value: number | undefined, max: number): string {
    if (!value || value <= 0 || max <= 0) {
      return '0%';
    }
    return `${Math.round((value / max) * 100)}%`;
  }

  get stageMaxValue(): number {
    return this.stageMax;
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

  get activityMaxValue(): number {
    return this.activityMax;
  }

  get questionSuccessMaxValue(): number {
    return this.questionSuccessMax;
  }

  get durationMaxValue(): number {
    return this.durationMax;
  }

  get scoreMaxValue(): number {
    return this.scoreMax;
  }

  get performanceMaxValue(): number {
    return this.performanceMax;
  }

  get peakMaxValue(): number {
    return this.peakMax;
  }

  get hasPerformance(): boolean {
    return !!this.data?.stages?.some(s => s.minPerformanceValue !== undefined && s.minPerformanceValue !== null);
  }

  get hasPeakActivity(): boolean {
    return !!this.data?.stages?.some(s => s.peakActivityCount);
  }

  hasPerformanceForStage(stage: any): boolean {
    return stage?.minPerformanceValue !== undefined && stage.minPerformanceValue !== null;
  }

  hasQuestionsForStage(stage: any): boolean {
    return (stage?.totalQuestionAnswers || 0) > 0;
  }

  get hasQuestions(): boolean {
    return !!this.data?.stages?.some(s => this.hasQuestionsForStage(s));
  }
}
