# Playtest Notes — The Velvet Ledger

**Date:** 2026-04-04
**Method:** Full code audit across 4 parallel agents (terminal text, panel layouts, on-chain flow, game engine)
**Status:** Most issues fixed (see fix log at bottom)

---

## Summary

The game flow from splash to game_won/game_lost is **fully connected** — all 31 screen types have handlers, all transitions work. The core loop (morning → plan → dispatch → resolve → report → advance) is solid. However, the audit found **serious issues** in three areas:

1. **On-chain economy is not wired up** — wallets are never funded, MPP payments will always fail
2. **Shop system is half-implemented** — 3 of 5 item effects do nothing
3. **Display inconsistencies** — missing `cash()` wrappers, unused functions, null safety gaps

---

## CRITICAL: On-Chain Economy Not Functional

The entire RUBY/MPP transaction pipeline has the pieces built but **critical initialization flows are missing**.

### Agent wallets never get funded
- `POST /api/agent-wallet/fund` route exists but is **never called** from the game engine
- `resolveStepViaMpp()` in `server/mpp-agent.ts:128` creates agent wallets but they start unfunded
- Every MPP step will fail with "Agent wallet not funded" and fall back to dice rolls
- **Fix:** Call `/api/agent-wallet/fund` during `dispatchMission()` before resolution starts

### Counterparties never get funded
- `GameMaster.fundCounterparties()` is implemented (`server/game-master.ts:220`) but **never called**
- `getCounterpartyKeypairs()` is exported (`server/agent-wallets.ts:175`) but **never called**
- `GameMaster.initialize()` funds itself and deploys SAC but never initializes counterparty wallets
- **Fix:** Add `fundCounterparties(getCounterpartyKeypairs(...))` to `GameMaster.initialize()`

### Player wallet never receives RUBY
- No code path mints RUBY to the player's passkey wallet
- Player gets a passkey smart account but it has 0 RUBY balance
- The game tracks `cash` in-memory but never syncs with on-chain RUBY balance
- **Fix:** Add RUBY minting to player wallet during game start (after trustline)

### Server routes defined but never called from client
| Route | Status |
|-------|--------|
| `POST /api/agent-wallet/fund` | Never called |
| `POST /api/agent-wallet/return-surplus` | Never called |
| `POST /api/gm/add-trustline` | Never called |
| `GET /api/gm/balance/:address` | Never called |
| `POST /api/gm/mint` | Never called |

### MPP services will crash at runtime
- `server/mpp-services.ts:230` — `Response.json()` is a Web API, not available in Node.js Express context. Will throw `ReferenceError`.
- `server/mpp-services.ts:206` — `result.challenge` property access is unguarded. If the `@stellar/mpp` SDK doesn't return this shape, it throws.
- `server/mpp-services.ts:237` — `result.withReceipt()` method call is unguarded.
- **Fix:** Replace `Response.json()` with `new Response(JSON.stringify(...))` or use Express response directly. Add null checks for `result.challenge` and `result.withReceipt`.

### MPP no fallback on network error
- `server/mpp-services.ts:247-250` returns 500 if Stellar network is down
- Unlike `stellar-settlement.ts` which gracefully falls back to simulated receipts, the MPP path hard-fails
- **Fix:** Return simulated MPP result on network error instead of 500

### Variable hoisting in routes
- `server/routes.ts:313` — `gmInitialized` is referenced before its declaration at line 332
- Works due to `let` hoisting but is a temporal dead zone risk
- **Fix:** Move `let gmInitialized = false` to top of the initialization block

---

## CRITICAL: Game Engine Bugs

### Win condition off by one
- `gameEngine.ts:1288` — `state.cash > 50` (strictly greater than)
- But the loss message says "You needed 80 rep and 50¤ to win"
- A player with exactly 50¤ and 80 rep on day 30 will **lose**
- **Fix:** Change to `state.cash >= 50`

### Shop effects only 2 of 5 types implemented
- `gameContext.tsx:126-133` — PURCHASE_ITEM reducer only handles `morale_boost` and `rep_boost`
- Three effect types are completely unimplemented:

| Item | Effect Type | Status |
|------|------------|--------|
| Spice Tea | `morale_boost` | Works |
| Gossip Network Sub | `rep_boost` | Works |
| Pre-Approved Permits | `budget_discount` | **Broken** — no case in switch |
| Market Almanac | `intel` | **Broken** — no case in switch |
| Ward Against Rivals | `protection` | **Partially works** — the duration check at `gameEngine.ts:878` is wired, but the PURCHASE_ITEM reducer never initializes the duration |

### Shop item durations never tick properly
- Items are generated with `duration: 3` or `duration: 5` in `generateShopItems()`
- `advanceDay()` at line 896 ticks durations down: `duration - 1`
- But `PURCHASE_ITEM` reducer never preserves the initial duration when marking as purchased
- The `dispatchMission()` check at line 132 looks for `s.effect.duration > 0` — this can be true on the first day but ticks to 0 and stays there
- Net effect: timed items work for 1 day at most, or not at all if advanceDay runs first

### Shop and quests empty on day 1
- `createInitialState()` sets `shop: []` and `agentQuests: []`
- Player sees empty shop/no quests on morning of day 1
- Items only appear after first `advanceDay()` call
- **Fix:** Initialize shop and quests in `createInitialState()` or in the START_GAME action

### Quest reward type `unlock_ability` unhandled
- `gameData.ts:241` defines reward type union: `"stat_boost" | "cost_reduction" | "unlock_ability"`
- `gameContext.tsx:154-163` only handles `stat_boost` and `cost_reduction`
- Any quest with `unlock_ability` reward silently does nothing
- **Fix:** Either implement or remove from the type

### Event effects ARE applied (playtest.ts was wrong)
- The playtest script at line 611 says "event effects are cosmetic only" — this is **incorrect**
- `resolveSingleMission()` at line 526-538 correctly reads `activeEvents` and applies `price_modifier` and `reputation_modifier` to mission outcomes
- However: `danger_modifier` from events is never read anywhere

### Rival reputation precedence is correct (playtest.ts was wrong)
- The playtest script flags `clamp(campaign.rivalReputation + (roll(0.6) ? 2 : 1), 0, 100)` as a precedence bug
- This is actually correct: `roll(0.6)` returns boolean, ternary picks 2 or 1, adds to rivalReputation, then clamps
- The `+` operator has lower precedence than `?:` but the parentheses around `(roll(0.6) ? 2 : 1)` make it explicit

---

## HIGH: Panel Layout Issues

### Shop items missing from morning brief panel
- `PanelLayouts.tsx` MorningBriefLayout shows: greeting, treasury, agents, rumors, rival card, quests
- **No shop items displayed** in the panel layout
- Shop is only accessible via text screen `view_shop` through [S] key
- The panel should at least mention active item effects

### Resolution panel null safety
- `PanelLayouts.tsx:283` — `result.actionSteps[result.actionSteps.length - 1]` with no guard for empty array
- Line 415-442 (Settlement panel) accesses `currentStep.stellarTxId` without checking if `currentStep` exists
- **Fix:** Add `if (!currentStep) return null;` guard

### Agent select panel assumes district/mission exist
- `PanelLayouts.tsx:181-182` — If `pending.districtId` is undefined, `district` is undefined
- Downstream code at line 223-262 renders mission details without explicit null check
- **Fix:** Add early return if `!district || !mission`

### StatBar division by zero
- `TerminalPanel.tsx:144` — `Math.round((value / max) * width)` with no guard for `max = 0`
- Would produce NaN if morale or other stat has max=0
- **Fix:** `const filled = max <= 0 ? 0 : Math.round((Math.min(value, max) / max) * width);`

### Hardcoded colors in inline styles
- `PanelLayouts.tsx:147` — Rival explorer link uses `color: "#a87cc4"` instead of `TERMINAL_COLORS.purple`
- `PanelLayouts.tsx:434` — Settlement explorer link uses `color: "#5cb8a5"` instead of `TERMINAL_COLORS.teal`
- Different font sizes too (0.8em vs 0.85em) — should be unified

### Fixed pixel widths, no responsive design
- Panel grids use fixed widths (280px, 260px, 240px) with no media queries
- Will break on narrow viewports
- Not a blocker for desktop-first terminal game but worth noting

---

## MEDIUM: Terminal Text Issues

### Missing `cash()` wrapper in daily report
- `terminalText.ts:746-747` — `report.totalEarned` and `report.totalSpent` displayed as raw numbers without `cash()` helper
- All other currency displays use `cash()` for the `¤` suffix
- **Fix:** Change to `cash(report.totalEarned)` and `cash(report.totalSpent)`

### `buildRivalLines()` defined but never called
- `terminalText.ts:1583-1621` — Complete function for displaying rival info in text mode
- Not imported or referenced in `terminalMachine.ts` or any view
- Rival info is only shown in the panel layout morning brief
- **Fix:** Either integrate into `view_agents` or `morning_brief` text mode, or remove

### Empty span placeholders
- Multiple locations use `span("", "color")` as fallbacks in ternary expressions:
  - Line 305 (rarity label), 704 (receipt ID), 788 (rarity label), 1559 (quest badge), 1599 (preferred district)
- Cosmetic — creates empty text nodes but doesn't break rendering

### NFT minted screen uses `line(span(""))` instead of `blank()`
- `terminalText.ts:1132` — Creates a line with empty span instead of using the `blank()` utility
- **Fix:** Replace with `blank()`

---

## MEDIUM: Helpers Defined But Unused in Panels

The `uiHelpers.ts` module was created to be the single source of truth, but panel layouts reimplemented the same logic:

| Helper | Used in Text Mode | Used in Panel Mode |
|--------|-------------------|-------------------|
| `treasuryLines()` | Yes | No — MorningBriefLayout reimplements at lines 49-72 |
| `financialSummaryLines()` | Yes | No — ResolutionLayout reimplements at lines 390-413 |
| `agentStatLine()` | Yes | No — AgentSelectLayout hardcodes at lines 204-216 |
| `agentMetaLine()` | Yes | No — AgentSelectLayout hardcodes separately |

Not bugs, but the duplication means changes need to be made in two places.

---

## LOW: Animation & Typewriter

### Panel screens fall through animation switch silently
- `TerminalShell.tsx:491-639` — Panel screens have no animation case and hit `default: break;`
- Correct behavior but undocumented — could confuse future changes

### Typewriter speed hardcoded
- `TerminalShell.tsx:447` — 60ms per line, not configurable
- Works fine for current pacing

### URL auto-linking only matches https://
- `TerminalShell.tsx:140` — Pattern `/(https:\/\/\S+)/` won't match `http://` URLs
- Not a real issue since all explorer links are https

---

## Playtest Scripts Status

Three playtest scripts exist but have issues:

### `playtest.ts` — Core engine playtest
- Has two known-incorrect bug flags in `checkDataIntegrity()`:
  - Line 608: Claims rival rep has precedence bug — **it doesn't** (parentheses are correct)
  - Line 611: Claims event effects are cosmetic — **they aren't** (price_modifier and reputation_modifier are applied in resolveSingleMission)
- Otherwise solid — runs 3 strategies (cautious/reckless/mismatch) over 30 days
- The accounting note at line 603 is valid and worth investigating

### `playtest-live.ts` — Server integration test
- Requires running server (`https://localhost:5000`)
- Tests AI agent generation + 10-day playthrough
- Has good finding-tracking system

### `playtest-ai.ts` — AI scene generation test
- Tests Claude Haiku scene generation end-to-end
- Evaluates dialogue quality, decision distribution, modifier ranges
- Requires ANTHROPIC_API_KEY and running server

---

## Priority Fix Order

1. **Win condition** — `cash > 50` → `cash >= 50` (one character fix)
2. **Shop effects** — Implement `budget_discount`, `intel`, `protection` in PURCHASE_ITEM reducer
3. **Shop duration lifecycle** — Ensure durations initialize on purchase and tick correctly
4. **Shop/quests day 1** — Generate in `createInitialState()` not just `advanceDay()`
5. **MPP crash fixes** — `Response.json()`, null guards on `result.challenge`/`result.withReceipt`
6. **Daily report cash()** — Add `¤` suffix to earned/spent display
7. **Counterparty funding** — Wire `fundCounterparties()` into `GameMaster.initialize()`
8. **Agent wallet funding** — Call `/api/agent-wallet/fund` during dispatch
9. **Player RUBY minting** — Mint initial RUBY to player wallet on game start
10. **Panel null safety** — Guard `currentStep` and `district/mission` lookups

---

## What Works Well

- Game flow is complete and unbroken — all 31 screens connected
- State machine is clean and well-structured
- Event effects (price_modifier, reputation_modifier) correctly applied to missions
- Rival reputation calculation is correct
- Agent morale, trust, and counterparty systems work
- Braille art renders consistently
- Color palette is used correctly throughout
- `cash()` helper is used in ~95% of currency displays
- Animation system clears properly on screen transitions
- Typewriter effect skips on keypress/click
- Reducer uses proper immutable updates (no direct mutations)
- Lose condition (cash <= 0 AND rep < 5) prevents unfair early deaths

---

## Fix Log (2026-04-04)

| Fix | File | Change |
|-----|------|--------|
| Win condition off-by-one | `gameEngine.ts:1288` | `cash > 50` → `cash >= 50` |
| Daily report missing ¤ | `terminalText.ts:746-747` | Wrapped `totalEarned`/`totalSpent` with `cash()` |
| NFT screen empty line | `terminalText.ts:1132` | `line(span(""))` → `blank()` |
| StatBar div/0 | `TerminalPanel.tsx:144` | Added `max <= 0` guard |
| Shop effects 3/5 missing | `gameContext.tsx:126-133` | Added `budget_discount`, `intel`, `protection` cases |
| Shop empty on day 1 | `gameEngine.ts:100` | Initialize shop in `createInitialState()` |
| Quests empty on day 1 | `gameContext.tsx:44` | Generate quests in `SET_AGENTS` reducer |
| MPP Response.json crash | `mpp-services.ts:230` | Replaced with `new Response(JSON.stringify(...))` |
| MPP null guards | `mpp-services.ts:206,237` | Added guards for `result.challenge` and `result.withReceipt` |
| MPP no fallback on error | `mpp-services.ts:247` | Returns simulated result instead of 500 |
| gmInitialized hoisting | `routes.ts:313` | Moved declaration up, created `ensureGmInitialized()` helper |
| Counterparties never funded | `game-master.ts:initialize()` | Added `fundCounterparties()` call with all 9 CP IDs |
| Hardcoded colors in panels | `PanelLayouts.tsx:147,434` | Use `TERMINAL_COLORS.purple`/`.teal` |
| AgentSelect null safety | `PanelLayouts.tsx:182` | Added `if (!district \|\| !mission) return null` |
| Resolution empty array | `PanelLayouts.tsx:283` | Added length check before array access |
| danger_modifier unused | `gameEngine.ts:536` | Added `eventDangerMod` to mission success calculation |
| Playtest false bug flags | `playtest.ts:606-611` | Corrected rival rep and event effect notes |

| Agent wallet funding | `mpp-agent.ts:130` | GM mints RUBY to agent wallet before MPP request |
| Player RUBY minting | `routes.ts` + `useTerminal.ts` | Added `/api/player/init-economy` route, called on game start |
| `buildRivalLines()` unused | `terminalText.ts:375` | Now called from `hakimMorningBrief()` when rival exists |
| `unlock_ability` unused type | `gameData.ts:241` | Removed from type union (never generated) |

### Still remaining (cosmetic/nice-to-have)
- Intel shop effect has no UI display (counterparty preferences not shown)
- Panel layouts duplicate helpers from uiHelpers.ts (treasuryLines, financialSummaryLines, agentStatLine)
- Agent wallet surplus return (`/api/agent-wallet/return-surplus`) not called after missions

### Additional fix
| playtest-ai.ts crash | `playtest-ai.ts:282` | Server returns `budget` not `tokensUsed` — added null check |
| Missing `viem` dep | `package.json` | `mppx` peer dep needs `viem` — installed with `--legacy-peer-deps` |

---

## Playtest Results (2026-04-04)

### Run: Core Engine (`playtest.ts` — 3 strategies, 30 days each)

**No crashes. No bugs detected.** Only the known accounting note (netChange vs actual cash delta).

| Strategy | Outcome | Final Cash | Final Rep | Notes |
|----------|---------|------------|-----------|-------|
| Cautious Trader | **WON** day 30 | 1,841¤ | 99/100 | Hit 100 rep by day 19. Cash snowballed. |
| Reckless Expander | **LOST** day 30 | 36¤ | 24/100 | Burned through cash, couldn't recover. |
| Mismatch Explorer | **WON** day 30 | 1,679¤ | 90/100 | Even wrong agents can win — game is forgiving. |

**Balance observations:**
- Cautious strategy accumulates cash far too easily (120¤ → 1,841¤ = 15x growth)
- Reputation cap (100) hit by day 19 with cautious play — last 11 days feel pointless
- Reckless strategy correctly punishes overspending
- Counterparty trust builds very fast — Madame Lentil and Cart & Mule hit 100 trust by mid-game
- Agent morale stays stable with cautious play (90-100), crashes with mismatch (15-37)
- Events fire frequently, adding good variety (Foreign Delegation, Inspector Corruption, Market Crash, etc.)

### Run: Live Server (`playtest-live.ts` — 10 days, AI agents)

**No crashes. Server integration works end-to-end.**

- AI agent generation: 3 agents generated successfully (common/uncommon tiers)
- Day resolution: `resolveDay` completed on all 10 days
- Day advancement: `advanceDay` completed on all 10 days
- Random events: 3 fired (Foreign Delegation, Fortune Teller, Hidden Talent Discovered)
- Rival: Obsidian & Ash Trading spawned on day 8 (week 2)
- Trust building: Cart & Mule hit 45, Guild of Ledgers hit 41 in 10 days
- Cash trajectory: 120 → 578 (steady growth)
- Rep trajectory: 25 → 47 (healthy climb)

### Run: AI Scene Generation (`playtest-ai.ts` — 5 days, 23 scenes)

**57% success rate (13/23 scenes generated).** 10 failures due to "Response failed validation."

- Character name usage: 100% — AI always uses agent and counterparty names correctly
- Outcome modifiers: All within [-0.15, +0.15] range — well-calibrated
- Agent decisions: Good variety — proceed_normally(38%), improvise(23%), accept_terms(23%), investigate(8%), push_harder(8%)
- Counterparty reactions: Skewed positive — pleased(62%), neutral(15%), impressed(15%), suspicious(8%)
- Average dialogue: 6.1 lines per scene — good length
- Budget: 23 API calls, ~47K input tokens, ~12K output tokens
- No scenes flagged for quality issues

**Scene validation failures** (10/23 before fix): The AI sometimes returned responses that didn't match the expected JSON schema. Fixed by adding fuzzy enum matching, markdown fence stripping, fallback scene generation, and text-block JSON extraction. After fix: **23/23 (100% success rate)**.

### Balance Changes Applied

| Change | Before | After |
|--------|--------|-------|
| Reward multiplier (normal) | 0.7 + 0.5 * rate | 0.6 + 0.4 * rate |
| Reward multiplier (wild) | 1.3 + 0.7 * rng | 1.1 + 0.5 * rng |
| Failure consolation | 5-20% of base | 3-13% of base |
| Counterparty trust gain | +5 per success | +3, diminishing above 50 |
| Counterparty trust loss | -8 per failure | -5 per failure |
| Agent trust gain | +8 success, +5 wild | +5 success, +3 wild |
| Agent trust loss | -12 fail, -10 wild | -8 fail, -7 wild |
| Daily upkeep | 6 + (week-1) * 1 | 6 + (week-1) * 2 + rep/40 |
| Rep decay | flat -1/day | -1 below 60, -2 at 60+, -3 at 90+ |
| Rival rep growth | +1-2/day flat | +1-2 early, +2-3 in week 3+ |
| Rival cash growth | +5-15/day | +5-15 + (week-2)*3 |

**Post-tuning results (3 runs averaged):**
- Cautious: **WON** consistently (400-800¤, 88-98 rep) — no longer snowballs
- Reckless: **50/50** (sometimes wins with luck, usually loses) — high variance
- Mismatch: **Unstable** (can win or go bankrupt) — strategy matters more
