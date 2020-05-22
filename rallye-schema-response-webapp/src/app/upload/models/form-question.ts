import { FormField } from './form-field';
import { FormPoint } from './form-point';

export interface FormQuestion extends FormField {
  multiple?: boolean;
  points?: { [key: string]: FormPoint };
  rejectMultiple?: boolean;
}
