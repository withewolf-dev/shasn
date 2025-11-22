'use client';

import { useEffect, useMemo, useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase';
import type {
  ConspiracyCardRow,
  IdeologyCardRow,
  SessionPlayerRow,
  TurnRow,
  VoteBankCardRow,
  ZoneControlRow,
  ZoneRow,
} from '@/types/database';
import { GameBoard } from '@/components/game/game-board';
import { GameActionPanel } from '@/components/game/game-action-panel';
import { GameSidebar } from '@/components/game/game-sidebar';
import { GameLog } from '@/components/game/game-log';

interface GameRealtimeContainerProps {
  sessionId: string;
  currentUserId: string;
  initialPlayers: SessionPlayerRow[];
  initialZoneControl: ZoneControlRow[];
  initialTurn: TurnRow | null;
  zones: ZoneRow[];
  ideologyCards: IdeologyCardRow[];
  voteBankCards: VoteBankCardRow[];
  conspiracyCards: ConspiracyCardRow[];
  initialLog: { id: number; action_type: string; payload: Record<string, unknown>; created_at: string }[];
}

export function GameRealtimeContainer({
  sessionId,
  currentUserId,
  initialPlayers,
  initialZoneControl,
  initialTurn,
  zones,
  ideologyCards,
  voteBankCards,
  conspiracyCards,
  initialLog,
}: GameRealtimeContainerProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const [zoneControl, setZoneControl] = useState(initialZoneControl);
  const [activeTurn, setActiveTurn] = useState<TurnRow | null>(initialTurn);
  const [logEvents, setLogEvents] = useState(initialLog);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (!payload.new) return;
          setPlayers((prev) => {
            const next = [...prev];
            const index = next.findIndex((player) => player.profile_id === payload.new.profile_id);
            const updated = payload.new as SessionPlayerRow;
            if (index >= 0) {
              next[index] = { ...next[index], ...updated };
            } else {
              next.push(updated);
            }
            return next.sort((a, b) => a.seat_order - b.seat_order);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zone_control', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (!payload.new) return;
          setZoneControl((prev) => {
            const index = prev.findIndex(
              (zone) => zone.session_id === payload.new.session_id && zone.zone_id === payload.new.zone_id,
            );
            const updated = payload.new as ZoneControlRow;
            if (index >= 0) {
              const next = [...prev];
              next[index] = updated;
              return next;
            }
            return [...prev, updated];
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'turns', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (!payload.new) return;
          const updated = payload.new as TurnRow;
          setActiveTurn((prev) =>
            !prev || updated.turn_index >= prev.turn_index ? updated : prev,
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'actions', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setLogEvents((prev) => [payload.new as GameLogEvent, ...prev.slice(0, 24)]);
        },
      );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const sortedPlayers = useMemo(() => players.slice().sort((a, b) => a.seat_order - b.seat_order), [players]);

  const currentPlayer = sortedPlayers.find((player) => player.profile_id === currentUserId);

  return (
    <main className="grid min-h-screen gap-6 px-6 py-6 lg:grid-cols-[3fr_1.2fr]">
      <div className="space-y-6">
        <GameBoard zoneControl={zoneControl} zones={zones} />
        <GameActionPanel
          sessionId={sessionId}
          currentUserId={currentUserId}
          activeTurn={activeTurn}
          ideologyCards={ideologyCards}
          voteBankCards={voteBankCards}
          conspiracyCards={conspiracyCards}
          currentHand={currentPlayer?.conspiracy_hand ?? []}
          zones={zones}
        />
        <GameLog sessionId={sessionId} initialEvents={logEvents} />
      </div>
      <GameSidebar
        sessionId={sessionId}
        players={sortedPlayers}
        activeTurn={activeTurn}
        currentUserId={currentUserId}
      />
    </main>
  );
}

interface GameLogEvent {
  id: number;
  action_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

