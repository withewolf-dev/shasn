# SHASN Tabletop → Digital UX Mapping

Source mechanics reference: https://tesera.ru/images/items/1549240/SHASN_Rulebook.pdf

## Player Lifecycle
- **Account / Auth**: Players sign in (email magic link) and create/display unique political persona.
- **Lobby & Matchmaking**: Host creates session, sets player count (2-5), invites via code/link. Lobby shows readiness, private chat for pre-game negotiation.
- **Onboarding Overlay**: Quick tutorial summarizing resources, ideologues, and UI affordances before first game.

## Session Structure
1. **Setup Phase**
   - System initializes board state (zones, volatile markers, vote bank decks, ideology/conspiracy decks).
   - Randomize start player; assign player mats and initial resources (0) digitally.
2. **Turn Loop** (clockwise order persists via turn queue service).
   - Turn header displays active player and expectation for neighbor to read card (digitally simulated via reveal animation or voice chat cue).
3. **Endgame Detection**
   - Real-time listener tracks majority counts per zone; triggers endgame modal once all zones have majorities or board fills up.

## Detailed Turn UX
1. **Ideology Card Resolution**
   - Right neighbor receives prompt to “draw & read” (UI reveals question + hidden rewards). They confirm after reading.
   - Active player selects option A/B without seeing resources; after locking choice, UI reveals earned resources + ideology color band, card saved in timeline.
   - Passive ideologue bonuses auto-credited and logged.
2. **Resource Management**
   - Resource tray with 12-slot cap indicator; discarding uses drag-to-reserve UI.
3. **Action Phase (multi-selectable, reorderable)**
   - **Influence Voters**: Vote bank marketplace shows 3 cards; user spends resources, chooses zone, places voters with drag/drop; validation ensures entire card to single zone.
   - **Form Majorities**: System auto-detects when threshold reached; prompts to confirm majority, flips voters, awards points, unlocks gerrymander.
   - **Conspiracy Market**: Deck preview w cost filter; purchases consume resources; inventory view for stored cards with contextual “play now” buttons.
   - **Trades**: Modal to propose 1:1 (or n:n) trades; sending invitation triggers notification to target player for acceptance.
   - **Gerrymandering**: Once unlocked, highlight eligible voters; allow selecting source/destination adjacent zones; enforce one move per majority (unless Idealist L6).
   - **Coalitions**: Zone panel shows “Form coalition” when two players control enough combined voters; UI guides ideology card exchange and defines vote split.
   - **Headlines & Volatile Zones**: When placing into volatile spot, UI pops upcoming headline card, resolved end-of-turn.
4. **Turn End**
   - Summary modal: resources gained/spent, voters placed, powers used.
   - System auto-deals next ideology card to left neighbor (with hidden rewards) and updates activity feed.

## Social/Narrative Layer
- **Negotiation Tools**: Table chat + quick offers (resources, conspiracy cards) integrated with rule constraints.
- **Event Log**: Chronological record of key actions (majorities, headlines, conspiracies) for transparency.

## Accessibility Considerations
- Color-blind safe ideology indicators.
- Mobile-responsive layout with collapsible trays.

