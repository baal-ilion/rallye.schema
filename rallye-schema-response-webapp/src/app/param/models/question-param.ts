import { QuestionType } from './question-type';

export interface QuestionParam {
  name: string;
  type: QuestionType;
  staff: boolean;
}
