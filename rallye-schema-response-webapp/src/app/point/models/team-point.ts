import { StagePoint } from './stage-point';

export interface TeamPoint {
  team: number;
  total: number;
  stagePoints: { [stage: number]: StagePoint };
}
