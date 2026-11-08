import type { AvatarId } from '@oncealiar/shared';
import type { CharacterArt } from './kit';
import { FREE_ART } from './free';
import { FAMILIA_ART } from './familia';
import { GADGET_ART } from './gadgets';
import { DISGUISE_ART } from './disguise';

export type { Mood, CharacterArt } from './kit';
export { MOODS } from './kit';

/** Every drawable character, keyed by AvatarId. */
export const CHARACTER_ART: Record<AvatarId, CharacterArt> = { ...FREE_ART, ...FAMILIA_ART, ...GADGET_ART, ...DISGUISE_ART };
