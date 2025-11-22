import { notFound, redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase';
import { GameRealtimeContainer } from '@/components/game/game-realtime-container';
import { ensureSessionDecks, peekDeckCards } from '@/server/decks';
import type {
  ConspiracyCardRow,
  IdeologyCardRow,
  VoteBankCardRow,
  ZoneRow,
} from '@/types/database';

interface GamePageProps {
  params: { sessionId: string };
}

export default async function GamePage({ params }: GamePageProps) {
  const supabase = createServerSupabaseClient();
  const sessionId = params.sessionId;

  const [
    {
      data: { user },
    },
    { error: sessionError },
    { data: players },
    { data: zoneControl },
    { data: activeTurn },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase
      .from('session_players')
      .select(
        `
        profile_id,
        seat_order,
        is_ready,
        resources,
        conspiracy_hand,
        profiles (
          display_name,
          avatar_seed
        )
      `,
      )
      .eq('session_id', sessionId)
      .order('seat_order', { ascending: true }),
    supabase.from('zone_control').select('*').eq('session_id', sessionId),
    supabase
      .from('turns')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_index', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!user) {
    redirect('/auth/login');
  }

  if (sessionError) {
    if (sessionError.code === 'PGRST116') {
      notFound();
    }
    throw sessionError;
  }

  await ensureSessionDecks(sessionId);
  const [zones, ideologyCards, voteBankCards, conspiracyCards, logEvents] = await Promise.all([
    supabase
      .from('zones')
      .select('*')
      .then((res) => (res.data as ZoneRow[]) ?? []),
    peekDeckCards<IdeologyCardRow>(sessionId, 'ideology', 1),
    peekDeckCards<VoteBankCardRow>(sessionId, 'vote_bank', 3),
    peekDeckCards<ConspiracyCardRow>(sessionId, 'conspiracy', 1),
    supabase
      .from('actions')
      .select('id, action_type, payload, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(25)
      .then((res) => res.data ?? []),
  ]);

  return (
    <GameRealtimeContainer
      sessionId={sessionId}
      currentUserId={user.id}
      initialPlayers={players ?? []}
      initialZoneControl={zoneControl ?? []}
      initialTurn={activeTurn}
      zones={zones}
      ideologyCards={ideologyCards}
      voteBankCards={voteBankCards}
      conspiracyCards={conspiracyCards}
      initialLog={logEvents}
    />
  );
}

