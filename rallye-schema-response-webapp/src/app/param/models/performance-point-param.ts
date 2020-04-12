import { PerformanceRangePointParam } from './performance-range-point-param';

export interface PerformancePointParam {
  name: string;
  ranges: PerformanceRangePointParam[];
}
