import { notFound, redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase';
import { GameRealtimeContainer } from '@/components/game/game-realtime-container';

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
    { data: zones },
    { data: ideologyCards },
    { data: voteBankCards },
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
    supabase.from('zones').select('*'),
    supabase.from('ideology_cards').select('*').limit(10),
    supabase.from('vote_bank_cards').select('*').limit(10),
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

  return (
    <GameRealtimeContainer
      sessionId={sessionId}
      currentUserId={user.id}
      initialPlayers={players ?? []}
      initialZoneControl={zoneControl ?? []}
      initialTurn={activeTurn}
      zones={zones ?? []}
      ideologyCards={ideologyCards ?? []}
      voteBankCards={voteBankCards ?? []}
    />
  );
}

