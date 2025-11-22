# Build Snapshot (Nov 22, 2025)

## Current Feature Set
- **Stack**: Next.js 15 (App Router, React Compiler), Supabase (Auth + Postgres + Realtime), Tailwind UI primitives.
- **Data Layer**: Migrations `0001–0005` provision profiles, sessions, session players (with conspiracy hand), zone control, turns, actions, zone metadata, decks (ideology/vote-bank/conspiracy/headline) plus seed inserts.
- **Auth & Profile**: Magic-link login (`/auth/login`), callback route, profile editor backed by Supabase upsert and RLS.
- **Lobby Flow**: `/lobby/[sessionId]` renders roster, host info, ready toggles, all synced via Realtime.
- **Shared Rules**: `src/lib/rules/*` centralizes resources, ideologues, bundle math, and helper utilities used by both UI and server actions.

### Game Experience
- `/game/[sessionId]`:
  - Server loads session, players, zone control, turn, deck previews, and recent actions before hydrating `GameRealtimeContainer`.
  - Client subscribes to `session_players`, `zone_control`, `turns`, and `actions` for live updates.
  - `GameBoard` shows per-zone voter counts and majority owners; `GameSidebar` tracks turns/roster; `GameActionPanel` handles ideology, vote-bank, and conspiracy flows; `GameLog` lists recent actions.
- **Turn Engine**:
  - `turn-loop.ts` auto-advances turns, computes neighbors, refreshes deck previews, and seeds turn state.
  - `submitIdeologyAnswer` / `submitInfluenceAction` enforce status transitions (`awaiting-ideology-answer` → `awaiting-influence` → completion) and log majorities.
- **Deck Management**:
  - `session_decks` stores per-session shuffles; helpers initialize, peek, and draw cards for ideology, vote-bank, and conspiracy decks.
- **Conspiracies**:
  - Players can buy cards (generic resource cost) and store them in `conspiracy_hand`.
  - UI exposes hand contents and “Play Selected” action; server logs `BUY_CONSPIRACY` / `PLAY_CONSPIRACY` and enforces ownership.
- **Action Log**: Real-time feed of turn starts/ends, ideology picks, majorities, and conspiracy activity.

## Next Targets
- Implement headline/volatile zone triggers and effects.
- Add coalition formation/withdrawal plus gerrymander/power enforcement.
- Render a graphical board with voter markers and volatile slots.
- Implement actual conspiracy effect logic (Block!, Reverse!, etc.).