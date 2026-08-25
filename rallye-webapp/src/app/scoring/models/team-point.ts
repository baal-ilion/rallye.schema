import { ChallengePoint } from './challenge-point';

export interface TeamPoint {
  team: number;
  total: number;
  challengePoints: { [challenge: number]: ChallengePoint };
}
