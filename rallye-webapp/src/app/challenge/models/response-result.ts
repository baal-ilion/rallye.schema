import { ChallengeResultSource } from './challenge-result-source';

export interface ResponseResult {
  name: string;
  resultValue?: boolean;
  source?: ChallengeResultSource | null;
  correctionMarks?: string[] | null;
}
