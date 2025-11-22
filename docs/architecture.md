# Next.js + Supabase Architecture Notes

## Frontend Stack (Next.js 15 / App Router)
- **Rendering**: Hybrid SSR/ISR for marketing, authenticated dashboards via RSC + client components.
- **Routing**:
  - `/` landing & invite entry.
  - `/lobby/[sessionId]` real-time lobby.
  - `/game/[sessionId]` main board.
  - `/rules` interactive rulebook / tutorial.
  - `/profile` player progression settings.
- **State Management**: Client components subscribe to Supabase Realtime channels (session players, zone control, turns, actions). Zustand/Context for local ephemeral state.
- **UI Systems**: Tailwind + Radix primitives; board interactions rendered via Canvas/SVG (Pixi optional) for responsiveness.
- **Security**: Middleware guards require auth for `/lobby` & `/game`, verifying Supabase session tokens server-side.

## Supabase Backend
- **Auth**: Magic links + OAuth (Google) with RLS-enabled `profiles` table.
- **Database Schema (core)**:
  - `profiles`: user metadata and rep.
  - `sessions`: host, status, ruleset options, timestamps.
  - `session_players`: seat order, readiness, resources, ideology progress, conspiracy hand.
  - `zones`: static config (thresholds, adjacency, volatile slots).
  - `zone_control`: per-session zone state, voter counts, majority owner, coalition metadata, gerrymander uses.
  - `session_decks`: deck type, cards/discard arrays for ideology/vote-bank/conspiracy/headline decks.
  - `turns`: turn index, active player, neighbor reader, state blob, timestamps.
  - `actions`: append-only log for auditing + UI event feed.
  - `vote_bank_cards`, `ideology_cards`, `conspiracy_cards`, `headline_cards`: canonical decks.
  - Supporting tables for trades, coalitions, gerrymanders as features land.
- **Realtime**: Supabase Realtime replicates updates from `session_players`, `zone_control`, `turns`, `actions`; clients subscribe per session.
- **Edge Functions / RPC**:
  - `start-turn`: enforces draw logic and resource cap.
  - `apply-action`: validates placements, purchases, conspiracy plays (prevent client tampering).
  - `resolve-headline`: executes headline effects asynchronously at end of turn.
- **Deterministic RNG**: Use Postgres `gen_random_uuid`/seeded shuffles per deck; log seeds for dispute resolution.
- **Rules Enforcement**: Postgres constraints + triggers ensure voter placements, resource caps, coalition card swaps, gerrymander limits, etc.

## Observability
- Supabase logs mirrored to Logflare/BigQuery.
- Next.js instrumented with OpenTelemetry spans for action latency.
- Analytics table `events_analytics` tracks KPIs (turn duration, negotiation frequency, drop rate).

## Scalability & Reliability
- PgBouncer connection pooling + RLS-friendly policies.
- Cache static rule data at edge; use Supabase Storage for assets.
- Worker (Supabase Queues) for delayed headline/conspiracy effects.


