import { HalLinks } from 'src/app/models/hal-links';
import { PerformancePointParam } from './performance-point-param';
import { QuestionParam } from './question-param';
import { QuestionPointParam } from './question-point-param';

export interface StageParam {
  id?: string;
  stage: number;
  name: string;
  inactive: boolean;
  questionPointParams: { [key: string]: QuestionPointParam };
  performancePointParams: { [key: string]: PerformancePointParam };
  questionParams: { [key: string]: QuestionParam };
  _links?: HalLinks;
}
