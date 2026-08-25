import { ResponseResult } from './response-result';
import { PerformanceResult } from './performance-result';
import { ChallengeResultSource } from './challenge-result-source';
import { HalLinks } from 'src/app/models/hal-links';

export interface ChallengeResult {
  id?: string;
  /** Nom historique du numéro d'épreuve dans le contrat JSON du back. */
  challenge: number;
  team: number;
  begin?: Date;
  end?: Date;
  missing?: number;
  checked?: boolean;
  results?: ResponseResult[];
  performances?: PerformanceResult[];
  responseSources?: ChallengeResultSource[];
  _links?: HalLinks;
}
