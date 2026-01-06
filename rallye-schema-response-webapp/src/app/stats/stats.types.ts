export interface StatsOverview {
  totalTeams: number;
  totalStages: number;
  totalParticipation: number;
  inProgress: number;
  finished: number;
  notStarted: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
}

export interface StageStat {
  stage: number;
  name: string;
  groupId?: string;
  groupName?: string;
  participants: number;
  finished: number;
  inProgress: number;
  averageDurationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  averageScorePercent: number;
  minScorePercent: number;
  maxScorePercent: number;
  minPerformanceValue?: number;
  averagePerformanceValue?: number;
  maxPerformanceValue?: number;
  totalQuestionAnswers?: number;
  totalQuestionSuccess?: number;
  minQuestionSuccess?: number;
  averageQuestionSuccess?: number;
  maxQuestionSuccess?: number;
  questionCount?: number;
  peakActivityBucket?: string;
  peakActivityCount?: number;
}

export interface TeamStat {
  team: number;
  name: string;
  inProgress: number;
  finished: number;
  totalDurationMinutes: number;
}

export interface PopularityStat {
  stage: number;
  name: string;
  participations: number;
}

export interface GroupPopularityStat {
  groupId: string;
  name: string;
  participations: number;
}

export interface TimelinePoint {
  bucket: string;
  starts: number;
  ends: number;
  averageDurationMinutes: number;
}

export interface ActivityPoint {
  bucket: string;
  active: number;
}

export interface StageHeatmapBucket {
  label: string;
  start: string;
  end: string;
  active: number;
}

export interface StageHeatmap {
  stage: number;
  name: string;
  buckets: StageHeatmapBucket[];
}

export interface StageGroupStats {
  groupId?: string;
  name: string;
  stages: StageStat[];
}

export interface StageQuestionRate {
  question: string;
  totalAnswers: number;
  successCount: number;
  successRate: number;
}

export interface StageQuestionsStats {
  stage: number;
  name: string;
  questions: StageQuestionRate[];
}

export interface StatsResponse {
  overview: StatsOverview;
  stages: StageStat[];
  teams: TeamStat[];
  popularity: PopularityStat[];
  groupPopularity: GroupPopularityStat[];
  timeline: TimelinePoint[];
  questions: StageQuestionsStats[];
  activity: ActivityPoint[];
  stageHeatmap: StageHeatmap[];
  stageHeatmapTimeline: StageHeatmapBucket[];
  stageGroups: StageGroupStats[];
}
