import { HalLinks } from 'src/app/models/hal-links';

export interface TeamInfo {
  id?: string;
  team: number;
  name: string;
  present: boolean;
  _links?: HalLinks;
}
