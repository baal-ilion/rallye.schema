import { PerformanceRangeType } from './performance-range-type';

export interface PerformanceRangePointParam {
  type: PerformanceRangeType;
  begin: number;
  end: number;
  point: number;
}
