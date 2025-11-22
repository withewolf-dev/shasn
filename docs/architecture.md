# Next.js + Supabase Architecture Notes

## Frontend Stack (Next.js 15 / App Router)
- **Rendering**: Hybrid SSR/ISR for marketing, authenticated dashboards via RSC + client components.
- **Routing**:
  - `/` landing & invite entry.
  - `/lobby/[sessionId]` real-time lobby.
  - `/game/[sessionId]` main board.
  - `/rules` interactive rulebook.
  - `/profile` player progression.
- **State Mgmt**: Client components subscribe to Supabase Realtime channels for session + turn updates; Zustand or React context for local ephemeral state.
- **UI Systems**: Tailwind + Radix primitives; board interactions rendered via Canvas/WebGL (Pixi) or SVG for responsiveness.
- **Security**: Middleware guards require auth for `/lobby` & `/game`, verifies Supabase session tokens server-side.

## Supabase Backend
- **Auth**: Email magic links + OAuth (Google) with RLS-enabled `profiles` table.
- **Database Schema (core tables)**:
  - `profiles`: user_id PK, display_name, avatar seed, reputation.
  - `sessions`: id, host_id, status (lobby, active, endgame), created_at, ruleset metadata.
  - `session_players`: session_id, user_id, seat_order, ideology_state JSONB, resource_counts JSONB, ideologue_progress.
  - `zones`: static config table, majority_threshold, adjacency array, volatile_slots.
  - `zone_control`: session_id, zone_id, voter_counts per player, majority_owner, coalition_meta.
  - `vote_bank_cards`, `ideology_cards`, `conspiracy_cards`, `headline_cards`: stored decks; session-specific draws tracked via `session_decks` + `deck_discard` tables.
  - `turns`: session_id, turn_index, active_player_id, neighbor_reader_id, start/end timestamps.
  - `actions`: granular log (type, payload) for auditing + replay.
  - `trades`, `coalitions`, `gerrymanders`: specialized child tables for constraints + analytics.
- **Realtime**: Supabase Realtime replicates updates from `zone_control`, `session_players`, `turns`, `actions` to subscribed clients.
- **Edge Functions**:
  - `start-turn`: enforces card draw logic and resource cap server-side.
  - `apply-action`: validates and mutates state for purchases, gerrymanders, conspiracies (prevents client tampering).
  - `resolve-headline`: executes headline effects asynchronously at end of turn.

## Game Logic Services
- **Server Action Workflow**: Next.js Server Actions call Supabase RPCs (Postgres functions) to mutate state atomically.
- **Deterministic RNG**: Use Postgres `gen_random_uuid` seeds stored per deck to ensure fairness + reproducibility.
- **Rules Enforcement**: Postgres constraints & triggers check voter placement counts, coalition card swaps, resource caps.

## Observability
- Supabase logs mirrored to Logflare/BigQuery.
- Next.js instrumented with OpenTelemetry spans for action latency.
- Analytics table `events_analytics` aggregates KPIs (turn duration, negotiation frequency, drop rate).

## Scalability & Reliability
- Use Supabase connection pooling (PgBouncer) + RLS-friendly policies.
- Cache static rule data via edge caching/CDN; use Supabase Storage for asset delivery.
- Introduce worker (Supabase Queues) for headline/conspiracy resolution requiring delays.

