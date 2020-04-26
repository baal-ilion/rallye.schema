import { HalLink } from 'src/app/models/hal-link';
import { HalLinks } from 'src/app/models/hal-links';
import { QuestionPageParam } from './question-page-param';

interface ResponseFileParamLinks extends HalLinks {
  responseFileModel: HalLink;
}

export interface ResponseFileParam {
  id?: string;
  stage: number;
  page: number;
  template: string;
  height: number;
  width: number;
  questions: { [name: string]: QuestionPageParam };
  _links: ResponseFileParamLinks;
}
