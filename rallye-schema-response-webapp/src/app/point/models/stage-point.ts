import { QuestionPoint } from './question-point';

export interface StagePoint {
  stage: number;
  total: number;
  questions: QuestionPoint[];
}
