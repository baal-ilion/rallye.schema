import { HalLinks } from '../../models/hal-links';
import { PerformancePointParam } from './performance-point-param';
import { QuestionParam } from './question-param';
import { QuestionPointParam } from './question-point-param';
import { StageGroup } from './stage-group';

export interface QuestionPointParams {
  [key: string]: QuestionPointParam;
}

export interface PerformancePointParams {
  [key: string]: PerformancePointParam;
}

export interface QuestionParams {
  [key: string]: QuestionParam;
}

export interface StageParam {
  id?: string;
  stage: number;
  name: string;
  inactive: boolean;
  questionPointParams: QuestionPointParams;
  performancePointParams: PerformancePointParams;
  questionParams: QuestionParams;
  group?: StageGroup | null;
  _links?: HalLinks;
}
