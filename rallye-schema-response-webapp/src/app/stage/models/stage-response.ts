import { QuestionPoint } from 'src/app/point/models/question-point';
import { ResponseResult } from './response-result';
import { PerformanceResult } from './performance-result';
import { HalLinks } from 'src/app/models/hal-links';

export interface StageResponse {
  id?: string;
  stage: number;
  team: number;
  begin?: Date;
  end?: Date;
  results?: ResponseResult[];
  performances?: PerformanceResult[];
  total?: number;
  questions?: QuestionPoint[];
  finalised?: boolean;
  active?: boolean;
  _links?: HalLinks;
}
