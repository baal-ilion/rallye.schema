import { FormField } from './form-field';
import { Corners } from './corners';

export interface FormArea extends FormField {
  corners?: Corners;
  text?: string;
}
