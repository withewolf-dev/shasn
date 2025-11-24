# Build Snapshot (Nov 24, 2025)

## Current Feature Set
- **Stack**: Next.js 15 (App Router, React Compiler), Supabase (Auth + Postgres + Realtime), Tailwind UI primitives.
- **Data Layer**: Migrations `0001–0008` cover profiles, sessions, session players (resources, conspiracy hand + flags, ideology progress), zone control, turns, actions, zone metadata, decks (ideology / vote-bank / conspiracy / headline) plus seed inserts.
- **Auth & Profile**: Magic-link login (`/auth/login`), callback route, profile editor backed by Supabase upsert and RLS.
- **Lobby Flow**: `/lobby/[sessionId]` renders roster, host info, ready toggles, all synced via Realtime.
- **Shared Rules**: `src/lib/rules/*` centralizes resources, ideologues (passive income implemented), bundle math, headline/conspiracy helpers, and constants used by both UI and server actions.

### Game Experience
- `/game/[sessionId]`:
  - Server loads session, players, zone control, turn, deck previews, and recent actions before hydrating `GameRealtimeContainer`.
  - Client subscribes to `session_players`, `zone_control`, `turns`, and `actions` for live updates.
  - `GameBoard` shows per-zone voter counts and majority owners; `GameSidebar` tracks turns/roster; `GameActionPanel` handles ideology, vote-bank, coalition requests, and conspiracy flows; `GameLog` lists recent actions.
- **Turn Engine**:
  - `turn-loop.ts` auto-advances turns, computes neighbors, refreshes deck previews, applies ideologue passive income, and seeds turn state.
  - `submitIdeologyAnswer` / `submitInfluenceAction` enforce status transitions (`awaiting-ideology-answer` → `awaiting-influence` → completion) and log majorities.
- **Deck Management**:
  - `session_decks` stores per-session shuffles; helpers initialize, peek, and draw cards for ideology, vote-bank, conspiracy, and headline decks.
- **Conspiracies (MVP)**:
  - Players can buy cards (generic resource cost) into `conspiracy_hand`, select targets where required, and trigger implemented effects (currently Media Smear).
  - Unimplemented cards are surfaced as “coming soon” to avoid broken states.
- **Headlines & Volatile Zones**:
  - Placing into volatile slots queues a headline draw; seeded effects (scandal, bonus voter, media loss + skip, etc.) run server-side and log to `actions`.
- **Coalitions & Gerrymanders**:
  - Coalition formation is available with enforced ideology swaps; solo-majority gerrymanders validated for adjacency, capacity, and penalties.
- **Action Log**: Real-time feed of turn starts/ends, ideology picks, passive income, majorities, conspiracies, and headlines.

## MVP Scope (Playtest Build)
- Play a full loop with: ideology answers, passive income, resource cap enforcement (manual discard if exceeded), vote-bank purchases, majority claims, coalitions, solo gerrymanders, volatile/headline triggers, and the Media Smear conspiracy effect.
- UI communicates any “coming soon” systems (remaining conspiracies, trades, ideologue powers) so players know house rules.
- Manual guardrails: host can end session if all zones have majorities; off-board trades handled verbally/by admin tweaks.

## Explicitly Out of MVP
- **Trading system**: no UI or validation for resource/card trades.
- **Ideologue Level 4/6 powers**: not implemented; only passive income is honored.
- **Additional conspiracy cards**: Backroom Bargain/Block!/Reverse! and most of the deck still pending.
- **Graphical board / drag-drop voters**: board remains numeric/textual.
- **Coalition withdrawal & advanced rules**: limited to formation only.
- **Headlines beyond seeded five**: rest of deck unimplemented.
- **Automated endgame scoring**: winner calc/summary will be added post-playtest; host may need to enforce manually.
- **Comprehensive automated tests**: manual QA only for now.

## Next Targets (Post-MVP)
- Implement full conspiracy deck effects + timing windows.
- Build trade/negotiation pipeline (resource + card swaps with approvals).
- Add ideologue L4/L6 powers with per-turn limits.
- Render graphical board with draggable voters, volatile icons, and coalition badges.
- Automate endgame detection + scoring summary + rematch flow.
- Add coalition withdrawal, advanced gerrymander limits, and additional headlines.
- Backfill unit/integration tests for engine + UI flows.