import { FormArea } from './form-area';
import { FormQuestion } from './form-question';

export interface FormGroup {
  fields: { [key: string]: FormQuestion };
  areas: { [key: string]: FormArea };
  lastFieldIndex: number;
}
