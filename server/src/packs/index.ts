import type { WordPack } from '@oncealiar/shared';
import { starter } from './starter.js';
import { party } from './party.js';
import { popCulture } from './pop-culture.js';
import { aroundTheWorld } from './around-the-world.js';
import { throwback } from './throwback.js';
import { afterDark } from './after-dark.js';
import { familyNight } from './family-night.js';
import { office } from './office.js';

/** All word packs, free first. `starter` is the default and must stay free. */
export const PACKS: WordPack[] = [
  starter,
  party,
  popCulture,
  aroundTheWorld,
  throwback,
  afterDark,
  familyNight,
  office
];
