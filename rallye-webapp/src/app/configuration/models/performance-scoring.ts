import { PerformanceScoringRange } from './performance-scoring-range';

export interface PerformanceScoring {
  name: string;
  valueFormat?: PerformanceValueFormat;
  decimalPlaces?: number;
  unit?: string;
  ranges: PerformanceScoringRange[];
}

export enum PerformanceValueFormat {
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  DURATION_MINUTES_SECONDS = 'DURATION_MINUTES_SECONDS',
  DURATION_HOURS_MINUTES = 'DURATION_HOURS_MINUTES',
  DURATION_HOURS_MINUTES_SECONDS = 'DURATION_HOURS_MINUTES_SECONDS',
  ANGLE_DEGREES_MINUTES = 'ANGLE_DEGREES_MINUTES',
  ANGLE_DEGREES_MINUTES_SECONDS = 'ANGLE_DEGREES_MINUTES_SECONDS'
}
