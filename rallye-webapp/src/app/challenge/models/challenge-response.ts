import { QuestionPoint } from 'src/app/scoring/models/question-point';
import { ResponseResult } from './response-result';
import { PerformanceResult } from './performance-result';
import { HalLinks } from 'src/app/models/hal-links';

export interface ChallengeResponse {
  id?: string;
  /** Nom historique du numéro d'épreuve dans le contrat JSON du back. */
  challenge: number;
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
