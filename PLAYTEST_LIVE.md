# The Velvet Ledger -- Live Playtest Notes

**Date:** 2026-04-03
**Method:** Script-driven via `playtest-live.ts`, hitting live server at `https://localhost:5000`
**Engine tested:** `client/src/lib/gameEngine.ts` (createInitialState, dispatchMission, resolveDay, advanceDay)
**Server tested:** `POST /api/generate-agents`
**Brand name:** "Desert Rose Trading"
**Days played:** 10 (game over triggered at end of day 10, entering day 11)

---

## Key Questions Answered

### 1. Does resolveDay actually work?
**YES.** resolveDay completed without crashes on all 10 days, including days with 0, 1, and 2 active missions. No white screen bug reproduced.

### 2. Does advanceDay crash?
**NO.** advanceDay completed without crashes on all 10 days. Campaign week transitions (week 1 -> week 2 on day 8), rival brand introduction, upkeep, reputation decay, comeback mechanic, and random event rolling all functioned correctly.

### 3. Are the new fields (campaign, activeEvents, triggeredRandomEventIds) properly initialized?
**YES.** All three fields were present and correctly typed at every validation checkpoint:
- `campaign`: Properly initialized with week=1, totalDays=30, upkeepPerDay=8, isGameOver=false, hasWon=false, rivalReputation=0, rivalCash=0
- `activeEvents`: Initialized as empty array `[]`, correctly populated when rival event fired on day 8
- `triggeredRandomEventIds`: Initialized as empty array `[]`, maintained throughout
- `pendingDecisions`: Initialized as empty array `[]`

### 4. White screen bug?
**NOT REPRODUCED.** resolveDay did not crash during this playtest session.

---

## Run Summary

- **Result:** LOST -- "Bankrupt and forgotten. The bazaar has moved on without you."
- **Game over trigger:** Cash 0 + Reputation < 5 (hit 0 rep on day 10 advance)
- **Cash trajectory:** 100 -> 101 -> 84 -> 27 -> 4 -> 25 -> 17 -> 9 -> 0 -> 0 -> 0
- **Rep trajectory:** 25 -> 25 -> 28 -> 28 -> 29 -> 16 -> 15 -> 14 -> 9 -> 4 -> 0

### AI Agent Generation
Server successfully generated 3 agents for "Desert Rose Trading":
- Marrow the Shrewd (trade, common) -- H:11 S:-2 C:1, Risk:0.15, Fee:7
- Whisper Vex (scout, uncommon) -- H:-8 S:18 C:2, Risk:0.28, Fee:12
- Silk Tongue Yara (branding, common) -- H:3 S:-5 C:12, Risk:0.22, Fee:6

Budget used: 0.38 cents of 25 cent daily limit. Agent generation took one API call.

---

## BUGS FOUND

### BUG 1: Daily report shows ALL historical completed missions on idle days (MAJOR)

When `dailyReport.missionsRun` is 0, the playtest script's `slice(-0)` returns the entire `completedMissions` array. But the root cause is deeper: the game engine stores all completed missions in `state.completedMissions` and the daily report only tracks counts, not indices. Any UI code that tries to show "today's missions" by slicing the end of `completedMissions` using `missionsRun` will show everything when `missionsRun === 0`.

**Location:** Any consumer of `state.completedMissions` + `state.dailyReport.missionsRun`
**Impact:** UI would show stale mission results on idle days
**Fix:** Either add a `dayCompleted` field to each completed mission, or have the daily report include mission IDs.

### BUG 2: Investigation missions are net-negative even on success (BALANCE)

Every successful "Investigate Rival Claims" mission returned 10-12 earned vs 27 spent, for a net loss of -15 to -17. Investigation missions have a `baseReward` of 10, but the cost is `budget (15) + agent fee (12) = 27`. Even a successful mission cannot break even because `baseReward * rewardMultiplier` at best gives ~17 (with `0.7 + stepSuccessRate * 0.5 = 1.2` multiplier, yielding 12). This means investigation/scout missions are a cash trap.

**Impact:** Scout/investigation missions drain cash faster than they generate value. The only return is rumors and reputation, but reputation gains are tiny (+1 to +2).
**Suggestion:** Either increase `baseReward` for investigation missions, or make the rumor/intel value more tangible (e.g., intel directly triggers a profitable event).

### BUG 3: Strategy locked into death spiral by day 5 with 3 agents (BALANCE)

With only 3 AI-generated agents (common/uncommon rarity), the economy became unsustainable by day 4-5. The daily upkeep of 8 per day, combined with investigation missions that lose money even on success, meant the player could only afford 1 mission per day after day 3. By day 5, no missions were affordable.

The emergency patron mechanic (25 free cash at cost of -8 rep) kicked in once on day 5->6, but the cash was still not enough to fund missions with the available agents (cheapest mission+agent combo: 10+6 = 16 or 15+12 = 27). With 25 cash, only 1 mission was possible, and it was a net loss. This creates an unrecoverable death spiral.

**Key issue:** With 3 agents instead of the default 5, the economy needs to be viable with fewer but potentially better missions per day.

### BUG 4: Random events fire but are never resolved (DESIGN GAP)

The `pendingRandomEvent` field is set by `advanceDay`, but there is no engine function to resolve random event choices. The events appear in state but are effectively cosmetic -- the player sees the event, but choosing an option has no mechanical effect unless implemented in UI code.

The Fortune Teller event fired 3 times (days 2, 5, and 8) but its effects (e.g., +25 cash from "path of gold") were never applied.

**Impact:** Random events are atmospheric but mechanically dead. If a player chose "The path of gold" (+25 cash, -2 rep), that cash injection could have saved the run.
**Fix:** Add `resolveRandomEvent(state, choiceIndex)` to the game engine that applies effects and adds the event ID to `triggeredRandomEventIds`.

### BUG 5: Silk Tongue Yara never deployed -- branding missions too expensive (BALANCE)

The branding specialist (Yara, charm:12, fee:6) was never used because the cheapest branding mission ("Luxury Brand Campaign") costs 35 base budget + 6 fee = 41. This was unaffordable after day 3. Meanwhile, trade missions have lower base budgets (30-35) but still require 37-42 total.

**Impact:** 1 of 3 agents sat idle for the entire run, wasting the player's roster slot.

### BUG 6: The Whisper Network consistently fails (FEEL)

In every interaction with The Whisper Network counterparty, the action step failed. This may be due to low reliability combined with `paid_intel` action type. The scout agent (Whisper Vex) with scoutBonus:18 should boost success, but the Whisper Network's base reliability may be too low.

**Impact:** Feels unfair -- the player's best scout agent cannot reliably extract intel from the intel counterparty.

---

## BALANCE OBSERVATIONS

### Economy is too tight with AI-generated common agents
The default 5 agents include some with high stats (Pepper Jack: haggle 25, Auntie Null: scout 30). The AI-generated common agents have much lower peaks (haggle 11, scout 18, charm 12). This means lower success rates and lower rewards, while costs remain fixed.

### Reputation decay is punishing (-1/day baseline)
With daily -1 rep decay, plus -5 when broke, plus -8 for patron loan, reputation collapses rapidly once the player enters a cash crisis. From rep 29 to rep 0 in 5 days. There is no way to recover reputation without spending cash, and no cash means no missions.

### Upkeep escalation (8 + (week-1)*2) compounds the spiral
Week 1: 8/day. Week 2: 10/day. This acceleration hits right when the player is struggling. Going from 8 to 10 upkeep on day 8 was the final blow.

### Comeback mechanic triggers only once effectively
The patron loan (25 cash at -8 rep) fires when broke AND rep >= 15. After the first firing drops rep below 15, it never fires again. This is by design, but it means there is exactly one lifeline.

---

## WHAT FEELS WRONG

1. **Cash spiral is too fast.** One bad day (the Pop-Up Stall failure on day 3, -32 net) was enough to doom the entire run. There is no recovery path once cash drops below ~30.

2. **Idle days feel terrible.** Days 5-10 were entirely idle -- no missions dispatched, no choices to make. The player watches their reputation and cash decay with no agency. This is the most likely "white screen" scenario -- not a crash, but an empty game loop.

3. **Investigation missions feel like a trap.** They cost more than they return even on success. New players who use scouts will lose money faster.

4. **Random events appearing but being unresolvable feels like a tease.** The Fortune Teller showed up three times with tantalizing choices but nothing happened.

5. **Agent fee structure penalizes scouts.** Whisper Vex's fee of 12 is the highest, but her specialty (investigation/scout) yields the lowest returns. The game punishes the player for using their most expensive agent.

---

## WHAT'S FUN

1. **AI agent generation works well.** The generated agents have personality, distinct quirks, and appropriate stat distributions. Marrow the Shrewd's "touches merchandise exactly three times" quirk is memorable.

2. **Counterparty trust system is satisfying.** Seeing trust build over time with Madame Lentil's Emporium (trust 21) and Cart & Mule (trust 21) feels like relationship building. The Whisper Network dropping to -12 trust from failed interactions creates narrative tension.

3. **The rival brand introduction is a good moment.** "The Crimson Ledger" showing up on day 8 with its own reputation tracker creates urgency (though in this run, we were already dying).

4. **Side effects and rumors add flavor.** "A street performer composed a jingle about your brand. It's catchy." is exactly the right tone.

5. **Counterparty trail in mission results is compelling.** Seeing the agent navigate through "Guild of Ledgers -> Madame Lentil's -> Cart & Mule" with individual success/fail per step makes missions feel like journeys.

---

## COUNTERPARTY STATUS (End of Game)

| Counterparty | Trust | Interactions | Mood |
|---|---|---|---|
| Madame Lentil's Emporium | +21 | 3 | neutral |
| Cart & Mule Logistics Co. | +21 | 3 | cooperative |
| The Guild of Ledgers | +15 | 3 | neutral |
| Crows & Associates Data Bureau | +11 | 4 | hostile |
| The Whisper Network | -12 | 2 | cooperative |

---

## TECHNICAL NOTES

- `createInitialState` properly defaults all counterparty trust fields via `c.trust ?? 0` pattern (fix from previous playtest was applied)
- `resolveDay` with 0 active missions correctly returns a minimal daily report without crashing
- `advanceDay` correctly handles: upkeep deduction, reputation decay, patron loan, campaign week progression, rival brand introduction, random event rolling, mood shifts
- Settlement adapter (simulated) works correctly -- all settlements produce receipts
- No NaN values detected in any trust, priceModifier, or stat fields at any checkpoint
- Game over condition (`cash <= 0 && reputation < 5`) fired correctly at the right threshold

---

## RECOMMENDATIONS

1. **Increase base rewards for investigation/scout missions** -- at minimum, `baseReward` should be >= `baseBudget` to allow profitable outcomes on success
2. **Add `resolveRandomEvent()` to the game engine** -- random events are fully defined but have no resolution path
3. **Add a "cheap mission" or "free action" for broke players** -- even something like "street hawking" for 0 budget that gives 5-10 cash would prevent the idle spiral
4. **Reduce reputation decay when player has no cash** -- currently -5 when broke on top of -1 base, which is crushing. Consider -2 when broke instead.
5. **Scale mission costs to agent count** -- if the player has 3 agents instead of 5, mission budgets or rewards should adjust
6. **Tag completed missions with day number** -- to fix the daily report showing stale missions on idle days
