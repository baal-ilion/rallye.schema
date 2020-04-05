import { HalLink } from './hal-link';

export interface HalLinks {
  self?: HalLink;
  [s: string]: HalLink | HalLink[];
}
