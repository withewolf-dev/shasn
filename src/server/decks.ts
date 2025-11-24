'use server';

import { CONSPIRACY_EFFECTS } from '@/lib/rules';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { DeckType, SessionDeckRow } from '@/types/database';

const DECK_SOURCES: Record<DeckType, { table: string }> = {
  ideology: { table: 'ideology_cards' },
  vote_bank: { table: 'vote_bank_cards' },
  conspiracy: { table: 'conspiracy_cards' },
  headline: { table: 'headline_cards' },
};

export async function ensureSessionDecks(sessionId: string) {
  const supabase = createServerSupabaseClient();

  const { data: existing, error } = await supabase
    .from('session_decks')
    .select('deck_type')
    .eq('session_id', sessionId);
  if (error) throw new Error(error.message);

  const existingTypes = new Set(existing?.map((row) => row.deck_type) ?? []);
  const missingDecks = (Object.keys(DECK_SOURCES) as DeckType[]).filter(
    (deckType) => !existingTypes.has(deckType),
  );

  for (const deckType of missingDecks) {
    const ids = await fetchCardIds(deckType);
    if (ids.length === 0) continue;

    const shuffled = shuffle(ids);
    const { error: insertError } = await supabase.from('session_decks').insert({
      session_id: sessionId,
      deck_type: deckType,
      cards: shuffled,
    });
    if (insertError) throw new Error(insertError.message);
  }
}

export async function peekDeckCards<TRecord = unknown>(
  sessionId: string,
  deckType: DeckType,
  limit = 1,
): Promise<TRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('session_decks')
    .select('*')
    .match({ session_id: sessionId, deck_type: deckType })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return [];

  const deckRow = data as SessionDeckRow;
  const cardIds = deckRow.cards.slice(0, limit);
  if (cardIds.length === 0) return [];

  return fetchCardRecords<TRecord>(deckType, cardIds);
}

export async function drawDeckCards(sessionId: string, deckType: DeckType, count = 1) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('session_decks')
    .select('*')
    .match({ session_id: sessionId, deck_type: deckType })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Deck ${deckType} not initialized for session ${sessionId}`);

  const deckRow = data as SessionDeckRow;
  const remaining = deckRow.cards.slice(count);
  const drawn = deckRow.cards.slice(0, count);
  const discard = [...deckRow.discard, ...drawn];

  const { error: updateError } = await supabase
    .from('session_decks')
    .update({ cards: remaining, discard })
    .match({ session_id: sessionId, deck_type: deckType });
  if (updateError) throw new Error(updateError.message);

  return drawn;
}

async function fetchCardIds(deckType: DeckType) {
  const supabase = createServerSupabaseClient();
  const source = DECK_SOURCES[deckType];
  const { data, error } = await supabase.from(source.table).select('id');
  if (error) throw new Error(error.message);
  let ids = (data ?? []).map((row) => row.id);
  if (deckType === 'conspiracy') {
    ids = ids.filter((id) => CONSPIRACY_EFFECTS[id]?.implemented);
  }
  return ids;
}

async function fetchCardRecords<TRecord>(deckType: DeckType, ids: string[]): Promise<TRecord[]> {
  const supabase = createServerSupabaseClient();
  const source = DECK_SOURCES[deckType];

  const { data, error } = await supabase
    .from(source.table)
    .select('*')
    .in('id', ids);
  if (error) throw new Error(error.message);

  const order = new Map(ids.map((id, index) => [id, index]));
  return (data ?? []).sort((a: { id: string }, b: { id: string }) => {
    const ai = order.get(a.id) ?? 0;
    const bi = order.get(b.id) ?? 0;
    return ai - bi;
  }) as TRecord[];
}

function shuffle<T>(array: T[]): T[] {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

