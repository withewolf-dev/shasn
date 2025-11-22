# Build Snapshot (Nov 22, 2025)

- **Stack**: Next.js 15 (App Router, React Compiler), Supabase (Auth + Postgres + Realtime), Tailwind UI.
- **Data Layer**: Migrations `0001–0005` provision profiles, sessions, session players, zone control, turns, actions, decks, and seed data for zones + cards.
- **Auth & Profile**: Magic-link login (`/auth/login`), callback route, profile editor with Supabase-backed upsert.
- **Lobby Flow**: `/lobby/[sessionId]` shows roster, host info, ready toggles hitting `session_players`.
- **Shared Rules**: `src/lib/rules/*` defines resources, ideologues, and helpers consumed by both UI and engine.
- **Game Loop**:
  - `/game/[sessionId]` loads session state and hydrates `GameRealtimeContainer`.
  - Realtime subscriptions keep players, zone control, turns, and action log in sync.
  - `GameActionPanel` exposes ideology, vote-bank, and conspiracy controls backed by server actions.
  - `turn-loop.ts` auto-advances turns, enforces state transitions, and seeds deck previews.
- **Conspiracies**: Deck + hand management in Supabase; players can buy and play cards with logs.

- **Next Targets**: Headline/volatile zone effects, coalition tools, graphical board, play effects for each conspiracy type.
# Build Snapshot (Nov 22, 2025)

- **Stack**: Next.js 15 (App Router, React Compiler), Supabase (Auth + Postgres + Realtime), Tailwind UI primitives.
- **Data Layer**: Supabase migrations (`0001–0003`) provision profiles, sessions, session players, zone control, turns, actions, zones, vote-bank, ideology, conspiracy, and headline cards. Seeds deployed via `npx supabase db push`.
- **Auth & Profile**: Magic-link login (`/auth/login`), callback route, profile editor with Supabase-backed upsert.
- **Lobby Flow**: `/lobby/[sessionId]` renders roster, host info, and per-player ready toggles that mutate `session_players`.
- **Shared Rules**: `src/lib/rules/*` defines resources, ideologues, and helpers to keep UI + engine consistent.
- **Game Loop**:
  - `/game/[sessionId]` server component loads session state and hydrates `GameRealtimeContainer`.
  - Client subscribes to Supabase Realtime (`session_players`, `zone_control`, `turns`) for live updates.
  - `GameBoard`, `GameSidebar`, and `GameActionPanel` display zone control, turn status, and expose ideology + vote-bank actions.
  - Server actions (`resolveIdeologyAnswer`, `influenceVoters`, `submitIdeologyAnswer`, `submitInfluenceAction`) mutate Supabase state with resource accounting and action logs.
- **Utilities**: Supabase browser/server clients, env loader with guards, shared database types for strong typing across UI/engine.

