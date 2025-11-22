export type ResourceType = 'funds' | 'media' | 'clout' | 'trust';

export type ResourceBundle = Partial<Record<ResourceType, number>>;

export type IdeologueId = 'capitalist' | 'showman' | 'supremo' | 'idealist';

export interface IdeologuePower {
  title: string;
  summary: string;
  level: 4 | 6;
  constraints?: string[];
}

export interface IdeologueDefinition {
  id: IdeologueId;
  displayName: string;
  passiveBenefit: string;
  powers: [IdeologuePower, IdeologuePower];
}

export interface VoteBankCardDefinition {
  id: string;
  voters: 1 | 2 | 3;
  cost: ResourceBundle;
  /**
   * Resource pre-marked on the physical card that The Idealist (L4) can ignore.
   */
  markedCost?: ResourceType;
}

export interface ZoneDefinition {
  id: string;
  name: string;
  totalVoters: number;
  majorityRequired: number;
  volatileSlots: number;
  adjacentZoneIds: string[];
}

export interface HeadlineDefinition {
  id: string;
  title: string;
  effect: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

