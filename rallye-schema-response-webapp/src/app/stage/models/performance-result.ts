import { ResponseSource } from './response-source';

export interface PerformanceResult {
  name: string;
  performanceValue?: number;
  source?: ResponseSource;
}
