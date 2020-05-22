import { FormTemplate } from './form-template';
import { HalLinks } from 'src/app/models/hal-links';

export interface ResponseFileInfo {
  id?: string;

  stage?: number;
  page?: number;
  team?: number;

  checked?: boolean;

  filledForm?: FormTemplate;
  _links?: HalLinks;
}
