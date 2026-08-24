import { HalLinks } from '../../models/hal-links';
import { PerformanceScoring } from './performance-scoring';
import { QuestionDefinition } from './question-definition';
import { QuestionScoring } from './question-scoring';
import { ChallengeGroup } from './challenge-group';

export interface QuestionScorings {
  [key: string]: QuestionScoring;
}

export interface PerformanceScorings {
  [key: string]: PerformanceScoring;
}

export interface QuestionDefinitions {
  [key: string]: QuestionDefinition;
}

export interface ChallengeConfiguration {
  id?: string;
  version?: number;
  /** Nom historique du numéro d'épreuve dans le contrat JSON du back. */
  challenge: number;
  name: string;
  questionScorings: QuestionScorings;
  performanceScorings: PerformanceScorings;
  questionDefinitions: QuestionDefinitions;
  group?: ChallengeGroup | null;
  _links?: HalLinks;
}
