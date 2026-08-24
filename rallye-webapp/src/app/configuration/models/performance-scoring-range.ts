import { PerformanceRangeType } from './performance-range-type';

export interface PerformanceScoringRange {
  type: PerformanceRangeType;
  begin: number;
  end: number;
  point: number;
  expression: string;
}
