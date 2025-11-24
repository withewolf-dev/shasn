export type ConspiracyEffectSlug = 'media_smear' | 'backroom_bargain';

export interface ConspiracyEffectConfig {
  cardId: string;
  slug: ConspiracyEffectSlug;
  requiresTarget?: boolean;
  implemented: boolean;
  instructions?: string;
}

const MEDIA_SMEAR_ID = '40404040-dddd-4ddd-8ddd-dddddddddddd';
const BACKROOM_BARGAIN_ID = '30303030-cccc-4ccc-8ccc-cccccccccccc';

export const CONSPIRACY_EFFECTS: Record<string, ConspiracyEffectConfig> = {
  [MEDIA_SMEAR_ID]: {
    cardId: MEDIA_SMEAR_ID,
    slug: 'media_smear',
    requiresTarget: true,
    implemented: true,
    instructions: 'Pick an opponent to strip 1 media resource and silence their next conspiracy play.',
  },
  [BACKROOM_BARGAIN_ID]: {
    cardId: BACKROOM_BARGAIN_ID,
    slug: 'backroom_bargain',
    requiresTarget: true,
    implemented: false,
    instructions: 'Trade two resources with another player without needing their approval (coming soon).',
  },
};

export function getConspiracyEffectConfig(cardId?: string | null) {
  if (!cardId) return null;
  return CONSPIRACY_EFFECTS[cardId] ?? null;
}

