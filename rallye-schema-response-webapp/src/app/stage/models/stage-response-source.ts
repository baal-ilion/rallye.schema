import { ResponseSource } from './response-source';

export interface StageResponseSource extends ResponseSource {
  pointUsed: boolean;
}

function isStageResponseSource(source: ResponseSource): source is StageResponseSource {
  return source.type === 'StageResponse';
}
