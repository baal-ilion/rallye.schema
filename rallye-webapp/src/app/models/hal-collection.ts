import { HalEmbedded } from './hal-embedded';
import { HalLinks } from './hal-links';
import { HalPage } from './hal-page';

export interface HalCollection<T, R extends string> {
  _embedded?: HalEmbedded<T, R>;
  _links?: HalLinks;
  page?: HalPage;
}
