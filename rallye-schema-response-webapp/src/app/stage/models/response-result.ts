import { TypeSource } from './type-source';

export interface ResponseResult {
  name: string;
  resultValue?: boolean;
  source?: TypeSource | null;
}
