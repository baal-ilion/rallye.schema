import { UserSource } from './user-source';
import { ResponseFileSource } from './response-file-source';
import { StageResponseSource } from './stage-response-source';
import { ResponseSource } from './response-source';

export type TypeSource = UserSource | ResponseFileSource | StageResponseSource | ResponseSource;
