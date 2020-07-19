import { ResponseSource } from './response-source';

// tslint:disable-next-line: no-empty-interface
export interface UserSource extends ResponseSource {
}

export function isUserSource(source: ResponseSource): source is UserSource {
  return source?.type === 'User';
}
