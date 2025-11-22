# SHASN Digital Product Requirements Document

Source canon: [SHASN Rulebook](https://tesera.ru/images/items/1549240/SHASN_Rulebook.pdf)

## 1. Context & Vision
- Deliver a faithful-but-accessible digital version of SHASN, a negotiation-heavy political strategy board game.
- Preserve every tabletop rule (resources, ideologies, coalitions, conspiracies, headlines) while layering premium UX, telemetry, and live-ops rigor suitable for a flagship franchise.
- Platform targets synchronous cross-platform play (desktop/mobile browsers first release) with low-latency state sync and anti-cheat guarantees.

## 2. Goals & Success Metrics
- **Gameplay Parity**: 100% coverage of rulebook logic, validated via automated scenario tests and expert QA.
- **Engagement**: ≥70% D2 retention for cohorts that finish onboarding; average session ≥35 minutes.
- **Monetization Readiness**: Architecture supports cosmetics/battle passes without touching the deterministic core loop.
- **Stability**: <1% desync incidents per 1,000 turns; P95 action latency <250 ms.

## 3. Player Personas & Use Cases
- **Strategist Friends**: Private lobbies for 3-5 players exploring political roleplay.
- **Competitive Ladder**: Ranked queues with matchmaking and MMR to be phased in after MVP.
- **Learn-to-Play**: Solo tutorial vs scripted bots covering ideologue unlocks and advanced tactics.

## 4. Gameplay Requirements (Rule Coverage)
### 4.1 Components
- Game board with zones, volatile slots, adjacency graph.
- Ideology cards (policy dilemmas with dual outcomes/resources/ideologies).
- Vote bank cards (1/2/3 voter bundles with resource costs).
- Conspiracy cards (cost 4/5 resources, various powers).
- Headline cards (events triggered by volatile zones).
- Resources (Funds, Media, Clout, Trust - exact names configurable but must respect cap mechanics).
- Voter pegs (digital tokens per player per zone, majority side “S” flagged).
- Ideologue tracks: Capitalist, Showman, Supremo, Idealist; level 4 & 6 unlock milestones, passive resource drip per two cards.

### 4.2 Setup Flow
1. Host configures session (player count, optional variants) and invites others.
2. System initializes decks (ideology/conspiracy/headline/vote bank), shuffles with auditable seeds.
3. Assign seating order and mats; identify neighbor relationships.
4. Expose three vote bank cards on HQ mat; zero resources at start.

### 4.3 Turn Loop (strict sequence)
1. **Card Draw**: Player on right draws ideology card, sees both outcomes, hides resource rewards from active player.
2. **Answer Selection**: Active player chooses one of two answers without resource knowledge; after confirmation, resources revealed and credited along with passive ideologue income.
3. **Resource Cap Enforcement**: Active player must discard down to 12 resources before any actions if they exceed cap.
4. **Action Phase** (unordered operations, each validated):
   - Purchase vote bank cards and place corresponding voters in a single zone immediately.
   - Form majorities (solo or coalition) once >50% threshold reached; flip majority voters to scoring side.
   - Purchase/use conspiracy cards; may hold unlimited quantity and play out-of-turn except during another player’s active step (Block!/Reverse! allowed).
   - Trade resources or conspiracy cards at equitable ratios (1:1, 2:2, etc.).
   - Gerrymander (if eligible) non-majority voters between adjacent zones (one per majority per turn; restrictions lifted via Idealist L6).
   - Trigger/cooperate with headline mechanics when volatile slots occupied.
   - Manage coalitions (form, negotiate splits and ideology card exchange, or withdraw).
5. **Turn End**: Resolve pending headline cards triggered this turn; log summary; active player draws/reads next ideology card for neighbor.

### 4.4 Specific Mechanics & Logic
- **Influencing Voters**
  - Vote bank market always replenishes to 3 open cards.
  - Entire voter bundle from a card must be placed within same zone before turn ends.
- **Majorities & Scoring**
  - Zone-specific thresholds stored (e.g., 6 of 11). Once achieved, lock S-side voters; extra voters no longer contribute to score.
  - Majority unlocks gerrymander power for that zone; majority voters normally immune to gerrymandering/eviction except via ideologue/conspiracy allowances.
- **Coalitions**
  - Two players combine voters to reach threshold, negotiate ratio. Upon formation, each swaps an ideology card from their dominant ideologue as cost.
  - Zone gerrymander disabled while coalition stands; swapped cards remain with recipients even if coalition dissolves.
  - Withdrawal possible anytime; no refunds.
- **Gerrymandering**
  - Requires shared border between source and destination zone.
  - Only non-majority voters movable; cannot touch volatile-zone voters.
  - Baseline limit: one voter per controlled majority per turn; Idealist L6 doubles to two per majority and may target different opponents.
- **Resource Economy & Trading**
  - Resources acquired from ideology answers, passive ideologue bonuses, certain conspiracies.
  - Hard cap 12; discard extras immediately.
  - Trades must be even exchanges (resources or conspiracy cards). Unlimited frequency per turn.
- **Ideologues**
  - Passive: every 2 cards of same ideologue grants 1 matching resource at start of own turn.
  - Level 4 unlock at 4 cards, Level 6 at 6 cards; abilities usable immediately and each turn thereafter while card count maintained.
  - Capitalist: L4 Open Market (swap 1 resource for any 2 from reserve); L6 Land Grab (evict up to 2 voters anywhere except volatile slots each turn; evicted opponents redeploy next turn or lose voters).
  - Showman: L4 Echo Chamber (+1 bonus voter per vote bank purchase, max 3 per turn); L6 Targeted Marketing (spend 2 media + any 3 resources to convert 2 opponent voters in same zone, including majority).
  - Supremo: L4 Donations (steal up to 2 resources per turn from opponents); L6 Civil Disobedience (spend 1 resource twice to discard up to 2 opponent voters, including majority).
  - Idealist: L4 Blind Faith (waive marked cost on up to 3 vote bank cards per turn); L6 Mass Mobilisation (gerrymander 2 voters per majority per turn, including majority voters).
- **Volatile Zones & Headlines**
  - Volatile slots trig headline draw for owner of placed voter; effect resolves end of turn.
  - Once placed, voter cannot be moved, converted, evicted, or discarded by any means.
  - Headlines skew negative (~70%); UI must encourage strategic placement or sabotage by placing opponents.
- **Conspiracy Cards**
  - Costs (4 or 5 resources) displayed on reverse; payment can mix resource types.
  - Play timing: immediate, stored, or between turns except during another player’s action resolution (Block!/Reverse! exceptions follow original timing rules).
  - Unlimited hand size and plays per opportunity.
- **Scoring & Endgame**
  - Game ends when every zone has a majority. Winner = player with most majority voters (flipped S side).
  - Alternate clause: if board is full before all majorities set, trigger final round; each remaining player gets one last turn to manipulate state (coalitions, conspiracies, etc.).
  - If insufficient spaces exist to place a newly purchased voter bundle during endgame, discard those voters.

## 5. Digital Experience & UX Flows
- **Lobby**: Real-time roster, ready checks, role assignment (host vs guest), chat for negotiation.
- **Onboarding**: Interactive tutorial covering ideology selection, resource cap, majorities, gerrymander, and ideologues with inline references to the rulebook.
- **Turn UI**: Split screen showing ideology card prompt, resource tray, board view, action queue, legal move hints.
- **Negotiation Toolkit**: Persistent chat, quick-offer templates (resource trades, coalition proposals) with automated validation.
- **Event Log**: Immutable feed of actions (voter placements, conspiracies, headlines) for auditability and spectator clarity.
- **Analytics HUD**: Shows current ideologue progress, coalition status, gerrymander allowance.
- **Accessibility**: Color-blind friendly palettes and iconography for ideologues/resources; keyboard navigation for actions; mobile gestures for drag/drop.

## 6. Technical Execution Strategy
### 6.1 Next.js Application Layer
- App Router with server components for data fetching (Supabase client via cookies) and client components for board interactivity.
- UI packages: TailwindCSS + Radix UI; board rendering via SVG/Canvas with virtualization for voters.
- Middleware ensures authenticated Supabase session for `/lobby/*` and `/game/*` routes; anonymous read-only for `/rules`.
- Server Actions encapsulate privileged mutations (e.g., `playCard`, `placeVoters`, `formCoalition`), invoking Supabase RPCs to keep all state authoritative on Postgres.
- Edge runtime for low-latency turn transitions (Next.js + Vercel Edge Functions) subscribing to Supabase Realtime streams.

### 6.2 Supabase Services
- **Database**: Postgres with RLS enforcing session membership; tables described in `docs/architecture.md` (profiles, sessions, session_players, zones, zone_control, decks, turns, actions, trades, coalitions, gerrymanders, analytics).
- **Realtime**: Broadcast zone state, player resources, and turn tokens via Supabase Realtime channels; subscribe by session_id.
- **Auth**: Magic-link + OAuth; profile completion hook populates display name/avatar; store trust metrics for moderation.
- **Edge Functions / RPC**: Deterministic game engine hosted inside Supabase (SQL + plpgsql) to process actions atomically, including validation of:
  - Resource caps & payments.
  - Zone adjacency checks for gerrymanders.
  - Coalition card swaps and restrictions (no gerrymander on coalition zones).
  - Ideologue power prerequisites and per-turn limits.
  - Headline resolution queue (delayed job via Supabase Functions + Queues).
- **Storage**: Host art assets, rulebook excerpts, and match replays. Access gated by signed URLs.

### 6.3 Data Contracts & Telemetry
- Action payload schema versioned; stored in `actions` table for replay + anti-cheat review.
- Event bridge exports anonymized metrics (turn duration, drop-offs, win conditions) to BigQuery via Supabase Logflare.
- Alerts trigger if desync detected (client state hash diverges from server snapshot) or if action latency >250 ms P95 for 5 minutes.

### 6.4 Security & Compliance
- RLS ensures only session participants (or spectators with read-only flag) can read board state.
- Rate limiting on mutation endpoints to prevent spam (Supabase Functions + Next.js middleware).
- Cryptographic randomness seeds logged per deck to resolve disputes.
- Moderation pipeline for chat/trade abuse, with ability to pause player actions mid-game.

## 7. Testing & QA Strategy
- **Unit Tests**: Deterministic engine tests in plpgsql covering each rule (ideologue powers, coalition swaps, headline triggers).
- **Simulation Harness**: Headless Next.js test client running scripted matches to validate latency and rule coverage.
- **UX Research**: Wizard-of-Oz sessions capturing negotiation behavior to refine chat/trade UI.
- **Security Audits**: Pen tests on Supabase policies and Next.js middleware before GA.

## 8. Analytics & Live Ops
- Track funnel: lobby to first turn, first majority, first coalition, game completion.
- Monitor ideologue pick rates, conspiracy usage frequency, and headline outcomes to detect balancing issues.
- Provide admin console (protected route) for live game observation, headline deck rotation, and emergency patches.

## 9. Risks & Mitigations
- **Desync Risk**: Mitigate via authoritative server engine + state hash comparison each turn.
- **Negotiation UX Complexity**: Provide templated offers and contextual prompts to reduce friction.
- **Rulebook Completeness**: Maintain regression suite referencing canon link above to ensure no omission as content expands.
- **Scaling Realtime**: Partition channels per session; use Supabase Realtime broadcast with occupancy caps to avoid fan-out issues.

## 10. Milestones
1. **MVP Engine (8 weeks)**: Implement core decks, turn loop, majority logic, ideologue passives.
2. **Alpha Social Layer (4 weeks)**: Add chat, trades, coalitions, conspiracies, gerrymander UI.
3. **Beta Hardening (6 weeks)**: Telemetry, moderation, headline queue, cosmetics hooks.
4. **Launch (4 weeks)**: Load testing, marketing site, localization, accessibility polish.

