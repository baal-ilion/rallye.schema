import { ResponseSource } from './response-source';

export interface ChallengeResponseSource extends ResponseSource {
  pointUsed: boolean;
}

export function isChallengeResponseSource(source: ResponseSource | null | undefined): source is ChallengeResponseSource {
  return source?.type === 'ChallengeResponse';
}
