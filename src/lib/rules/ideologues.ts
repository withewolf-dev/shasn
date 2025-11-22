import type { IdeologueDefinition } from './types';

export const IDEOLOGUES: Record<IdeologueDefinition['id'], IdeologueDefinition> = {
  capitalist: {
    id: 'capitalist',
    displayName: 'The Capitalist',
    passiveBenefit:
      'For every 2 Capitalist ideology cards, gain +1 Funds resource at the start of your turn.',
    powers: [
      {
        level: 4,
        title: 'Open Market',
        summary:
          'Once per turn trade 1 resource with the Public Reserve for any 2 resources of your choice (both taken simultaneously).',
        constraints: ['Cannot exceed resource cap of 12 after the trade.'],
      },
      {
        level: 6,
        title: 'Land Grab',
        summary:
          'Evict up to any 2 voters from the board each turn (including majority voters) and return them to their owners.',
        constraints: [
          'Evicted opponents must redeploy those voters on their next turn or forfeit them.',
          'Voters in volatile zones remain immune.',
        ],
      },
    ],
  },
  showman: {
    id: 'showman',
    displayName: 'The Showman',
    passiveBenefit:
      'For every 2 Showman cards, gain +1 Media resource at the start of your turn.',
    powers: [
      {
        level: 4,
        title: 'Echo Chamber',
        summary:
          'Gain +1 extra voter for each Vote Bank Card you influence, up to 3 additional voters per turn.',
        constraints: ['Bonus voter must be placed with the voters from the original card.'],
      },
      {
        level: 6,
        title: 'Targeted Marketing',
        summary:
          'Spend 2 Media + any 3 other resources to convert 2 of an opponent’s voters in the same zone to your color (majority voters included).',
        constraints: ['Converted voters must belong to the same opponent and zone.', 'Volatile voters are immune.'],
      },
    ],
  },
  supremo: {
    id: 'supremo',
    displayName: 'The Supremo',
    passiveBenefit:
      'For every 2 Supremo cards, gain +1 Clout resource at the start of your turn.',
    powers: [
      {
        level: 4,
        title: 'Donations',
        summary: 'Snatch up to 2 resources from opponents every turn without compensation.',
        constraints: ['Can take both from one opponent or split 1 and 1.'],
      },
      {
        level: 6,
        title: 'Civil Disobedience',
        summary:
          'Pay 1 resource per voter (up to twice each turn) to discard an opponent’s voter from the board, including majority voters.',
        constraints: ['Each discard requires payment up front.', 'Volatile voters cannot be discarded.'],
      },
    ],
  },
  idealist: {
    id: 'idealist',
    displayName: 'The Idealist',
    passiveBenefit:
      'For every 2 Idealist cards, gain +1 Trust resource at the start of your turn.',
    powers: [
      {
        level: 4,
        title: 'Blind Faith',
        summary:
          'Ignore the marked resource cost on up to 3 Vote Bank Cards per turn when influencing voters.',
        constraints: ['Discount is optional per card.'],
      },
      {
        level: 6,
        title: 'Mass Mobilisation',
        summary:
          'Gerrymander 2 voters per owned majority each turn, including majority voters, splitting them across opponents as desired.',
        constraints: [
          'Cannot use if you control zero majorities.',
          'Volatile voters remain immovable.',
        ],
      },
    ],
  },
};

