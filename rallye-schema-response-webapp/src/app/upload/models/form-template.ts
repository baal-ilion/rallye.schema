import { Corners } from './corners';
import { CornerType } from './corner-type';
import { ShapeType } from './shape-type';
import { FormPoint } from './form-point';
import { FormGroup } from './form-group';
import { FormArea } from './form-area';

export interface FormTemplate {
  groups?: { [key: string]: FormGroup };
  corners?: Corners;

  points?: FormPoint[];
  areas?: FormArea[];

  cornerType?: CornerType;
  shape?: ShapeType;
  parentTemplate?: FormTemplate;
  name?: string;
  version?: string;
  rotation?: number;
  diagonal?: number;
  height?: number;
  width?: number;
  threshold?: number;
  density?: number;
  size?: number;
  isGroupsEnabled?: boolean;
  crop?: { [key: string]: number };
  usedGroupNames?: string[];
}
