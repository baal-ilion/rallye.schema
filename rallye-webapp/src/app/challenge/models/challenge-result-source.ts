import { UserSource } from './user-source';
import { SubmittedFormSource } from './submitted-form-source';
import { ChallengeResponseSource } from './challenge-response-source';
import { ResponseSource } from './response-source';

export type ChallengeResultSource = UserSource | SubmittedFormSource | ChallengeResponseSource | ResponseSource;
