export interface StatisticsOverview {
  totalTeams: number;
  totalChallenges: number;
  totalParticipation: number;
  inProgress: number;
  finished: number;
  notStarted: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
}

export interface ChallengeStatistics {
  challenge: number;
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

export interface TeamStatistics {
  team: number;
  name: string;
  inProgress: number;
  finished: number;
  totalDurationMinutes: number;
}

export interface PopularityStatistics {
  challenge: number;
  name: string;
  participations: number;
}

export interface GroupPopularityStatisticsistics {
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

export interface ChallengeHeatmapBucket {
  label: string;
  start: string;
  end: string;
  active: number;
}

export interface ChallengeHeatmap {
  challenge: number;
  name: string;
  buckets: ChallengeHeatmapBucket[];
}

export interface ChallengeGroupStatistics {
  groupId?: string;
  name: string;
  challenges: ChallengeStatistics[];
}

export interface ChallengeQuestionRate {
  question: string;
  totalAnswers: number;
  successCount: number;
  successRate: number;
}

export interface ChallengeQuestionStatistics {
  challenge: number;
  name: string;
  questions: ChallengeQuestionRate[];
}

export interface StatisticsResponse {
  overview: StatisticsOverview;
  challenges: ChallengeStatistics[];
  teams: TeamStatistics[];
  popularity: PopularityStatistics[];
  groupPopularity: GroupPopularityStatisticsistics[];
  timeline: TimelinePoint[];
  questions: ChallengeQuestionStatistics[];
  activity: ActivityPoint[];
  challengeHeatmap: ChallengeHeatmap[];
  challengeHeatmapTimeline: ChallengeHeatmapBucket[];
  challengeGroups: ChallengeGroupStatistics[];
}
