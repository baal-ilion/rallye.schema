import { HalEmbedded } from './hal-embedded';
import { HalLinks } from './hal-links';
import { HalPage } from './hal-page';

export interface HalCollection<T> {
  _embedded?: HalEmbedded<T>;
  _links?: HalLinks;
  page?: HalPage;
}
