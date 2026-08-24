import { QuestionType } from './question-type';

export interface QuestionDefinition {
  name: string;
  type: QuestionType;
  managedByOrganizer?: boolean;
}
