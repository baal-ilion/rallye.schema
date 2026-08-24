import { QuestionPoint } from './question-point';

export interface ChallengePoint {
  challenge: number;
  total: number;
  questions: QuestionPoint[];
}
