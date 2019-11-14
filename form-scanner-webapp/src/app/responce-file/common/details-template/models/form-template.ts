import { Point } from './point';
import { Corners } from './corners';

export class FormTemplate {
  fileUrl: string;
  fileAlt: string;
  points: { point: Point, valid: boolean, comment: string }[] = [];
  corners: Corners;
  height: number;
  width: number;
  square: number;
}
