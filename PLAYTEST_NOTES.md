# The Velvet Ledger -- Playtest Notes

**Date:** 2026-04-02
**Playtest method:** Script-driven, 3 full 30-day campaigns via `npx tsx playtest.ts`
**Engine tested:** `client/src/lib/gameEngine.ts` + `client/src/lib/gameData.ts`

---

## Runs Conducted

### Run 1: "Cautious Trader"
- **Strategy:** Best-matched agents for each mission type, cautious posture, base budgets, only dispatch 1-2 missions/day
- **Result:** WON on Day 30. Cash: 524. Rep: 100/100 (maxed by Day 11)
- **Cash trajectory:** 100 -> 171 -> 229 -> 269 -> 336 -> 454 -> 524
- **Rep trajectory:** 25 -> 35 -> 60 -> 76 -> 98 -> 100 -> 100

### Run 2: "Reckless Expander"
- **Strategy:** Max agents deployed, reckless/theatrical postures, 1.5x base budgets, prioritize branding
- **Result:** LOST on Day 29. Bankrupt by Day 15, slow bleed to game over.
- **Cash trajectory:** 100 -> 52 -> 42 -> 61 -> 49 -> 4 -> 0 -> 0
- **Rep trajectory:** 25 -> 34 -> 42 -> 56 -> 72 -> 72 (stalled) -> 2 (bled to death)

### Run 3: "Mismatch Explorer"
- **Strategy:** Wrong agents for wrong missions, extreme budgets (30% and 300%), all postures tested
- **Result:** LOST on Day 28. Bankrupt by Day 11, slow bleed to game over.
- **Cash trajectory:** 100 -> 135 -> 45 -> 73 -> 10 -> 0 -> 0
- **Rep trajectory:** 25 -> 48 -> 67 -> 86 -> 86 (stalled) -> 1 (bled to death)

---

## BUGS (must fix)

### 1. Missing default fields on 8 of 9 counterparties (CRITICAL)
All counterparties except "The Festival Criers Guild" are missing `trust`, `priceModifier`, `lastInteractionDay`, and `refusesService` fields in `gameData.ts`. This causes:
- `trust` becomes `undefined`, which turns into `NaN` after arithmetic in `updateCounterpartyTrust()`
- Trust-weighted counterparty selection breaks (weight calculations with NaN)
- The trust system effectively does not work for most counterparties
- Only Festival Criers has `trust: 0, priceModifier: 0, lastInteractionDay: 0, refusesService: false`

**Fix:** Add default values to all 8 counterparties in `INITIAL_COUNTERPARTIES`, or add defaults in `createInitialState()`.

### 2. Rival reputation operator precedence bug (line 747 of gameEngine.ts)
```typescript
campaign.rivalReputation = clamp(campaign.rivalReputation + roll(0.6) ? 2 : 1, 0, 100);
```
Due to JS precedence, this evaluates as `clamp((rivalReputation + roll(0.6)) ? 2 : 1, 0, 100)`, setting rival rep to 2 or 1 every day instead of incrementing it.

**Fix:** Add parentheses: `clamp(campaign.rivalReputation + (roll(0.6) ? 2 : 1), 0, 100)`

### 3. No counterparty supports `trade_execution` in the Fungal Quarter
The Fungal Quarter has "Underground Spice Run" requiring `trade_execution`, but no counterparty has `districtIds` including `"fungal-quarter"` while also supporting `trade_execution`. The engine falls back to any global counterparty, which masks the issue but produces incoherent narrative (Madame Lentil from the Velvet Steps handling Fungal Quarter trades).

**Fix:** Add `"fungal-quarter"` to Madame Lentil's `districtIds`, or add a Fungal Quarter merchant counterparty.

### 4. Cash accounting mismatch in daily reports
Budget is deducted upfront in `dispatchMission()`, but `moneySpent` in mission results is recalculated separately (as `budget * spendRatio`). The daily report's `netChange` uses `totalEarned - totalSpent` where `totalSpent` is this cosmetic value, not the actual budget deducted. This means the reported `netChange` does not match the actual cash change the player sees.

Example: Player dispatches with budget 30 + agent cost 8 = 38 deducted. Mission succeeds with `moneySpent = 24` (60% of 30, cautious) and `moneyEarned = 55`. Report says `netChange = +31` but player's actual cash only increased by 17 (55 - 38).

---

## BALANCE ISSUES

### 5. Economy is far too generous for cautious play
A simple 2-mission-per-day strategy with cautious posture and base budgets resulted in:
- Cash growing from 100 to 524 over 30 days (5.24x)
- Net positive on 20 out of 28 mission days
- Never once dipping below starting cash after Day 1

The core issue: `baseReward` values are too high relative to `baseBudget`. Examples:
- Premium Goods Negotiation: budget 30, reward 55 (183% return)
- Pop-Up Stall Operation: budget 25, reward 50 (200% return)
- Underground Spice Run: budget 15, reward 40 (267% return)

Even failed missions are softened: the cautious posture only spends 60% of budget on failure, and `moneyEarned` on failure is `baseReward * (0.1 + random * 0.2)`, providing a consolation payout.

**Suggestion:** Reduce base rewards to 1.0-1.3x of base budgets, or increase agent costs, or scale upkeep more aggressively.

### 6. Reputation grows too fast
With 2 cautious trade missions per day, reputation went 25 -> 100 in just 11 days. The reputation gain per mission is `(isWild ? 5 : 2) * district.reputationModifier`, with Velvet Steps at 1.5x giving +3 per normal success. Two missions per day = +6/day average, reaching 100 in about 12 days.

The win condition is 70 rep by day 30. This is trivially achievable by day 10 with basic play.

**Suggestion:** Either slow reputation gain (base +1 per normal success, +3 for wild), increase the win threshold, or make reputation decay slowly each day.

### 7. Unrecoverable bankruptcy spiral (unfun)
Once cash hits 0, the game enters a death spiral:
- Daily upkeep continues (-5 base, increasing to -11 by week 4)
- Cash is clamped to 0 (can't go negative)
- No missions can be dispatched (everything costs money)
- Reputation bleeds -5/day from being broke
- There is no recovery mechanism

In Run 2, the player went broke on Day 15 and then sat helplessly for 14 days watching reputation drain to 0. This is deeply unfun.

**Suggestions:**
- Add a "loan" or "emergency funds" mechanic (borrow 30 cash at cost of -10 rep)
- Allow one free mission per day (cheap agent + minimal budget)
- Trigger game over faster when broke (3 consecutive broke days = loss)
- Add a "sell reputation for cash" emergency option

### 8. Upkeep scaling is harsh but irrelevant
Upkeep grows from 5/day (week 1) to 11/day (week 4), but the cautious trader drowns in cash anyway. The upkeep scaling only matters for the reckless/struggling player, and for them it accelerates an already-unrecoverable spiral. The upkeep increase punishes failure without challenging success.

### 9. Rival brand is non-functional
Due to the operator precedence bug (#2), the rival's reputation stays at 1-2 forever. Even if fixed, the rival only shows up in the event log and has zero mechanical impact -- they don't compete for counterparties, don't steal missions, and don't affect the player's economy. The rival is a narrative presence only.

### 10. Events have no mechanical impact
Events like "Cinnamon Rush" and "Foreign Delegation" are generated and tracked, but their effects (`price_modifier`, `danger_modifier`, `reputation_modifier`) are never actually applied during mission resolution. The event system produces flavorful log messages but doesn't change gameplay.

To confirm: `resolveSingleMission()` does not read `state.activeEvents`. The effects are stored but ignored.

---

## WHAT FELT GOOD

- **Agent personality is charming.** The agent descriptions, quirks, and the difference between specialists (Pepper Jack's haggle strength, Marquis's charm) feel distinct and fun.
- **Counterparty flavor text is excellent.** Success/failure lines for each counterparty type are witty and varied ("Gerald the mule rejected the cargo on aesthetic grounds").
- **The action sequence system is well-designed.** Missions routing through multiple counterparties (negotiation -> trade_execution -> logistics) creates a sense of a living market network.
- **Side effects add surprise.** Random side effects like "Your agent accidentally insulted a diplomat" are entertaining moments.
- **Settlement receipts are a clever hook.** The simulated x402 flow receipts add worldbuilding without requiring real blockchain integration.
- **Day-by-day structure is satisfying.** The morning -> planning -> resolution -> reports cycle gives the player clear phases.

---

## WHAT FELT BROKEN OR UNFUN

1. **No strategic tension.** The cautious strategy wins easily with no hard choices. There's no reason to take risks.
2. **Bankruptcy is a slow death.** 14 days of helpless watching. Should end faster or offer recovery.
3. **Agent selection doesn't matter much.** The specialty bonuses are small (+25/200 = +12.5% chance) compared to base success rate. Mismatched agents still succeed frequently.
4. **No mission variety pressure.** Players can repeat the same 2 missions every day forever. No cooldowns, no scarcity, no "this mission was claimed by someone else."
5. **Reputation cap reached too early.** Hitting 100 rep on Day 11 means 19 days of gameplay with a maxed stat and no remaining challenge.
6. **Side effects are cosmetic.** "A new competitor appeared in your favorite district" appears frequently but changes nothing mechanically.
7. **Agent morale is almost always fine.** Cautious trader morale went UP over 30 days. Only the mismatch explorer saw modest morale drops. Morale rarely creates real decisions.

---

## MISSING FEEDBACK (things that happen but the player wouldn't know about)

1. **Counterparty trust changes** are invisible. Trust goes up/down every interaction, but nothing in the UI or narrative reflects this. The system is rich but hidden.
2. **Agent opinion formation** is silent. Agents develop opinions about counterparties and can refuse to work with them, but the player has no visibility into this until it causes a problem.
3. **Personality drift** (agent stats slowly changing) happens silently. The player wouldn't know their agent became more cautious after a wild failure.
4. **Event effects** (even if implemented) would be invisible. "Cinnamon Rush" says trades pay 50% more, but the player can't see which missions are affected or by how much.
5. **Wild outcome probability** is hidden. Players don't know which agents are more likely to have wild outcomes or how posture affects it.
6. **Budget efficiency** is unclear. There's no feedback on whether spending above or below base budget matters, or what the optimal budget is.

---

## SPECIFIC NUMBERS TO TUNE

| Parameter | Current | Suggested | Reason |
|-----------|---------|-----------|--------|
| Premium Goods baseBudget/baseReward | 30/55 | 35/45 | Too profitable |
| Pop-Up Stall baseBudget/baseReward | 25/50 | 30/40 | Too profitable |
| Underground Spice Run baseBudget/baseReward | 15/40 | 20/30 | Way too profitable |
| Luxury Brand Campaign baseBudget/baseReward | 40/25 | 35/30 | Costs too much for return, makes branding feel like a trap |
| Daily upkeep base | 5 | 8 | Too low to create pressure |
| Rep gain per normal success | 2 | 1 | Rep grows too fast |
| Rep gain per wild success | 5 | 3 | Rep grows too fast |
| Cautious posture success penalty | -0.10 | -0.05 | Cautious is free money with almost no downside |
| Reckless posture success bonus | +0.15 | +0.10 | Should be a real gamble, not just +15% free |
| Morale loss on failure | -8 | -12 | Morale is too stable |
| Morale loss on negative profit | -2 | -5 | Agents should care about losing money |
| Win condition reputation | 70 | 80 | Too easy to reach |
| Broke game-over condition | cash 0 AND rep < 10 | cash 0 for 3 days | End the misery faster |

---

## SUGGESTIONS FOR IMPROVEMENT

1. **Add mission cooldowns.** After completing a mission at a district, it's unavailable for 1-2 days. Forces variety.
2. **Implement event effects in mission resolution.** Wire `activeEvents` effects into `calculateSuccessChance()` and reward multipliers.
3. **Add a comeback mechanic.** Small loan (30 cash), emergency reputation liquidation, or a "patron" event that fires when broke.
4. **Surface counterparty trust to the player.** Show trust levels on the counterparty panel. Add flavor text when trust passes thresholds.
5. **Surface agent opinions.** Show agent opinions in their detail view. Warn when dispatching an agent to work with a counterparty they dislike.
6. **Make the rival interactive.** The rival should steal counterparty access, drive up prices, or compete for the same missions.
7. **Add reputation decay.** -1 rep per day naturally. Forces the player to keep doing branding missions throughout.
8. **Differentiate risk postures more.** Cautious should earn less (0.6x reward multiplier). Reckless should have a chance of 2x reward but also 0x reward.
9. **Budget efficiency feedback.** Show the player "optimal budget range" or give feedback like "your generous budget impressed the counterparty."
10. **Mid-game mission unlocks.** New missions that appear after reputation thresholds (40, 60, 80) to keep the game fresh.
