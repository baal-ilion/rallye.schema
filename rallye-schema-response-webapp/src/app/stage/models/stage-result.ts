import { ResponseResult } from './response-result';
import { PerformanceResult } from './performance-result';
import { TypeSource } from './type-source';
import { HalLinks } from 'src/app/models/hal-links';

export interface StageResult {
  id?: string;
  stage: number;
  team: number;
  begin?: Date;
  end?: Date;
  checked?: boolean;
  results?: ResponseResult[];
  performances?: PerformanceResult[];
  responseSources?: TypeSource[];
  _links?: HalLinks;
}
