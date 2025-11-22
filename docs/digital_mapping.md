# SHASN Tabletop → Digital UX Mapping

Source mechanics reference: https://tesera.ru/images/items/1549240/SHASN_Rulebook.pdf

## Player Lifecycle
- **Account / Auth**: Magic-link or OAuth sign-in, create/display unique persona.
- **Lobby & Matchmaking**: Host creates session, sets player count (2-5), invites via code/link. Lobby shows readiness, private chat for negotiation.
- **Onboarding Overlay**: Quick tutorial summarizing resources, ideologues, and UI affordances before first game.

## Session Structure
1. **Setup Phase**  
   - System initializes board state (zones, volatile markers, decks).  
   - Randomize start player; assign mats and zero resources.
2. **Turn Loop**  
   - Server tracks turn order; UI cues neighbor to “read” ideology cards (with hidden rewards).  
   - Turn summary panel highlights active player, expected action (answer vs influence).
3. **Endgame Detection**  
   - Realtime listener tracks majorities per zone; triggers endgame modal once all zones filled or board full.

## Detailed Turn UX
1. **Ideology Card Resolution**  
   - Neighbor view reveals both answers with hidden rewards; active player only sees prompt until choice locked.  
   - After lock, rewards animate into resource tray; ideology color tracked for ideologue progression.
2. **Resource Management**  
   - Resource tray with 12-slot cap indicator; discarding uses drag-to-reserve or click-to-trash UI.
3. **Action Phase (unordered)**  
   - **Influence Voters**: Vote bank marketplace shows 3 cards; spend resources, select zone, drag voters to board.  
   - **Form Majorities**: Auto-detect threshold; confirm flip, award points, unlock gerrymander button.  
   - **Conspiracies**: Deck preview + hand management; buttons to buy (resource deduction) or play (server action).  
   - **Trades**: Modal to propose 1:1 (or n:n) trades; asynchronous accept/reject.  
   - **Gerrymander**: Highlight eligible voters; click source/destination adjacency (enforce per-majority limit).  
   - **Coalitions**: Zone panel shows “Form coalition”; wizard guides card exchange, majority split, restrictions.  
   - **Headlines & Volatile Zones**: When placing into volatile slot, UI surfaces upcoming headline, resolves after actions.  
4. **Turn End**  
   - Summary modal: resources gained/spent, voters placed, powers used.  
   - Server auto-advances to next turn, UI updates action panel previews.

## Social Layer
- **Negotiation Tools**: Table chat, quick-offer templates (resources, conspiracies, voters) respecting rule constraints.  
- **Event Log**: Timeline of major actions (turn start/end, gerrymanders, conspiracies, headlines) for transparency.  
- **Notifications**: Toasts for power triggers, trades, headlines hitting a player.

## Accessibility
- Color-blind safe ideology indicators, zone outlines.  
- Mobile-responsive layout with collapsible trays, large tap targets.  
- Keyboard shortcuts for common actions (space to end turn, numeric keys for resource discard).


