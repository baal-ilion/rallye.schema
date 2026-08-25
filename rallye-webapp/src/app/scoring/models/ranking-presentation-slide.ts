import { Ranking } from './ranking';

export interface RankingPresentationPanel {
  title: string;
  ranking: Ranking[];
  performanceLabel?: string | null;
  performanceValues?: { [team: number]: number | null } | null;
}

export interface RankingPresentationSlide {
  columns: RankingPresentationPanel[][];
}
