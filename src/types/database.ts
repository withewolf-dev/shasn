export type ZoneControlRow = {
  session_id: string;
  zone_id: string;
  voter_counts: Record<string, number> | null;
  majority_owner: string | null;
  coalition: { players: string[]; split: Record<string, number> } | null;
  gerrymander_uses: number;
  volatile_slots?: { slot: number; player_id: string }[] | null;
  updated_at: string;
};

export type SessionPlayerRow = {
  session_id: string;
  profile_id: string;
  seat_order: number;
  is_ready: boolean;
  resources: Record<string, number> | null;
  conspiracy_hand?: string[];
  profiles?: {
    display_name: string | null;
    avatar_seed: string | null;
  } | null;
};

export type TurnRow = {
  id: number;
  session_id: string;
  turn_index: number;
  active_player: string;
  neighbor_reader: string | null;
  state: Record<string, unknown>;
  started_at: string;
  ended_at: string | null;
};

export type ZoneRow = {
  id: string;
  display_name: string;
  total_voters: number;
  majority_required: number;
  volatile_slots: number;
  adjacency: string[];
};

export type IdeologyCardRow = {
  id: string;
  prompt: string;
  answer_a: {
    text: string;
    resources: Record<string, number>;
    ideologue: string;
  };
  answer_b: {
    text: string;
    resources: Record<string, number>;
    ideologue: string;
  };
};

export type VoteBankCardRow = {
  id: string;
  voters: number;
  cost: Record<string, number>;
  marked_cost: string | null;
};

export type ConspiracyCardRow = {
  id: string;
  title: string;
  cost: number;
  description: string;
};

export type HeadlineCardRow = {
  id: string;
  title: string;
  effect: string;
  sentiment: 'positive' | 'negative' | 'neutral';
};

export type DeckType = 'ideology' | 'vote_bank' | 'conspiracy' | 'headline';

export type SessionDeckRow = {
  session_id: string;
  deck_type: DeckType;
  cards: string[];
  discard: string[];
  updated_at: string;
};

