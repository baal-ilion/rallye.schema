import { HalLink } from 'src/app/models/hal-link';
import { HalLinks } from 'src/app/models/hal-links';
import { FormQuestionDefinition } from './form-question-definition';

interface FormRecognitionConfigurationLinks extends HalLinks {
  formReferenceImage: HalLink;
}

export interface FormRecognitionConfiguration {
  id?: string;
  challenge: number;
  page: number;
  template: string;
  height: number;
  width: number;
  questions: { [name: string]: FormQuestionDefinition };
  _links?: FormRecognitionConfigurationLinks;
}
