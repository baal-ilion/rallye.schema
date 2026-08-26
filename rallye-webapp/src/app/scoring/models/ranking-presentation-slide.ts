import { Ranking } from './ranking';
import { PerformanceScoring } from '../../configuration/models/performance-scoring';

export interface RankingPresentationPanel {
  title: string;
  ranking: Ranking[];
  performanceLabel?: string | null;
  performanceValues?: { [team: number]: number | null } | null;
  performanceDefinition?: PerformanceScoring | null;
}

export interface RankingPresentationSlide {
  columns: RankingPresentationPanel[][];
}
