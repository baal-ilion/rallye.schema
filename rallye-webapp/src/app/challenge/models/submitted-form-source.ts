import { ResponseSource } from './response-source';

// tslint:disable-next-line: no-empty-interface
export interface SubmittedFormSource extends ResponseSource {
}

export function isSubmittedFormSource(source: ResponseSource | null | undefined): source is SubmittedFormSource {
  return source?.type === 'SubmittedForm';
}
