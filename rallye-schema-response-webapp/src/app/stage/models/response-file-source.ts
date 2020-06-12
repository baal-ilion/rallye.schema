import { ResponseSource } from './response-source';

// tslint:disable-next-line: no-empty-interface
export interface ResponseFileSource extends ResponseSource {
}

export function isResponseFileSource(source: ResponseSource): source is ResponseFileSource {
  return source.type === 'ResponseFile';
}
