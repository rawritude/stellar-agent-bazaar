# NEXT STEPS

This document lists the work that should happen next in priority order.

All previous priorities (settlement adapters, receipt ledger, content registries, event packs, persistence, testnet actions, brand depth) have been completed.

## Priority 1

### Intel shop effect UI

Goal:
When the Market Almanac is active, show counterparty greed/reliability/mood in the morning brief and agent select screens.

Why:
The item costs 20¤ and has a duration, but currently provides no visible benefit. Players buy it and see nothing.

## Priority 2

### Agent wallet surplus return

Goal:
After mission resolution, call `/api/agent-wallet/return-surplus` to transfer unused RUBY from agent wallets back to the player.

Why:
Agent wallets get funded with the full mission budget before MPP requests, but any unspent RUBY stays in the agent wallet forever. This leaks value.

## Priority 3

### Panel/helper consolidation

Goal:
Replace duplicated display logic in PanelLayouts.tsx with calls to uiHelpers.ts.

What's duplicated:
- Treasury display (MorningBriefLayout reimplements `treasuryLines()`)
- Financial summary (ResolutionLayout reimplements `financialSummaryLines()`)
- Agent stats (AgentSelectLayout reimplements `agentStatLine()`/`agentMetaLine()`)

Why:
Changes currently need to be made in two places. Single source of truth prevents drift.

## Priority 4

### Balance iteration

Goal:
More playtesting with real players to validate the tuned economy.

Key questions:
- Is cautious play too reliable? (Currently wins ~100% of the time)
- Is the late-game rep decay (-3/day at 90+) felt by players or just a background drain?
- Does the rival feel threatening enough? Should interference have mechanical effects beyond rumors?
- Are shop items worth buying? Is the budget discount noticeable?

## Priority 5

### Unlockable counterparties

Goal:
Add hidden NPCs that unlock through achievements or quest completion.

Ideas:
- High-trust counterparty reveals a back-channel contact
- Completing an agent quest unlocks a specialist vendor
- Reaching 60 rep unlocks the "VIP Traders' Circle"

Why:
Rewards exploration and gives players something to discover in repeat playthroughs.

## Architectural principles

- Keep simulated fallback available for all on-chain actions
- Every AI-generated output must have a fallback path
- Use uiHelpers.ts for all shared display logic
- CSS for borders/panels, braille for art, text for content
- RUBY for value, XLM for fees only
