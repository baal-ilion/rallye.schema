import { Point } from './point';
import { Corners } from './corners';

export class FormTemplate {
  fileUrl: string;
  fileAlt: string;
  points: {
    point: Point,
    valid: boolean | null,
    comment: string,
    field?: string,
    value?: string,
    selected?: boolean,
    initialSelected?: boolean,
    interactive?: boolean,
    manual?: boolean
  }[] = [];
  corners: Corners;
  height: number;
  width: number;
  initialHeight: number;
  initialWidth: number;
  square: number;
}
