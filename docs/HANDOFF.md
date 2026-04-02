# HANDOFF

This document is for any future coding agent or developer taking over work on Stellar Agent Bazaar.

## Project status

The project is no longer just a concept repo.
It is now a playable browser prototype called The Velvet Ledger Bazaar with a two-sided market interaction model.

Current state:
- concept repo created
- first playable single-player prototype built
- counterparty network architecture added
- README updated to explain the playable prototype and market network
- codebase structured so future Stellar testnet settlement can be layered in

Recent commit history:
- `ebee87d` Initialize Stellar Agent Bazaar concept repo
- `47b9439` First playable: The Velvet Ledger Bazaar prototype
- `30bf0d9` feat: add two-sided counterparty architecture with market network
- `9afa436` docs: update README with counterparty architecture and network docs

## Product direction

This game is a funny, funky bazaar-management game designed to teach people how agents work by making them operational.

The key product idea is:
- the player funds and dispatches agents
- those agents do not act in a vacuum
- they interact with counterparties and market systems on the other side
- they spend budget, create outcomes, and return reports
- those reports let the player react strategically

This is intentionally not a massive civilization simulation.
It is a focused merchant-management / agent-operations game.

## What has already been built

### Playable game loop
- day-based progression
- planning → resolution → reports loop
- agent dispatch
- budget and posture selection
- district-based missions
- report UI

### Content implemented
- 3 districts
- 5 agents
- 9 mission templates
- 9 counterparties / market nodes
- 8 action types
- rumor and side-effect generation

### Core architecture already in place
- `client/src/lib/gameData.ts`
  - canonical game data types
  - agents
  - districts
  - missions
  - counterparties
  - action types
  - settlement mode flags
- `client/src/lib/gameEngine.ts`
  - pure mission resolution
  - routing through counterparties
  - step-by-step action resolution
  - day resolution and progression
- `client/src/lib/gameContext.tsx`
  - reducer-backed React state

### UI already in place
- `client/src/pages/game.tsx`
  - main shell with tab-based navigation
- `client/src/components/CommandDesk.tsx`
  - main dashboard and status widgets
- `client/src/components/AgentRoster.tsx`
  - agent cards and stats
- `client/src/components/DistrictMap.tsx`
  - district overview
- `client/src/components/MissionComposer.tsx`
  - dispatch flow and network route preview
- `client/src/components/DailyReport.tsx`
  - report cards and interaction trails
- `client/src/components/MarketNetwork.tsx`
  - visible network layer for counterparties and action types
- `client/src/components/RumorTicker.tsx`
  - rumors and future premium-intel framing

## Architectural intent

The current implementation is deliberately structured so it can move from:
- simulated settlement
into:
- Stellar testnet-backed settlement

without rewriting the whole game.

The key abstraction is that missions now resolve through an `actionSequence`, and each action step is handled by a matching counterparty.
That is the seam where future settlement adapters should plug in.

## What is simulated vs real today

### Simulated today
- all settlement
- all counterparty interactions
- all rumors and event outcomes
- all financial state

### Real today
- playable UI and game loop
- modular data model for counterparties and action types
- visible network and settlement-readiness framing
- architecture for two-sided interactions

## Important design decisions already made

1. The game should remain fun without live chain dependency.
2. The chain should enhance selected actions, not dominate every system.
3. Counterparties are first-class objects in the game model.
4. Missions should produce readable report trails, not hidden calculations.
5. Future expansion should mostly mean adding data and adapters, not rewriting engine structure.

## Known gaps

The following has not yet been built:
- actual Stellar testnet settlement adapter
- persistent save/load state via backend or DB
- externalized event registry separate from gameData monolith
- modular counterparty packs loaded from separate files
- real receipt ledger panel with tx hashes
- on-chain execution log / explorer links
- agent memory / history over multiple days beyond lightweight current stats
- backend orchestration for deterministic or replayable simulations

## Immediate next recommendation

The next coding agent should focus on formalizing the settlement layer.

Recommended next milestone:
1. create a settlement adapter abstraction
2. support both `simulated` and `testnet` execution modes
3. attach receipts to `ActionStep`
4. add a receipt ledger UI
5. keep the game playable when testnet is unavailable

## Suggested technical next steps

### 1. Create settlement adapter layer
Suggested new files:
- `client/src/lib/settlement/types.ts`
- `client/src/lib/settlement/simulated.ts`
- `client/src/lib/settlement/testnet.ts`
- `client/src/lib/settlement/index.ts`

Goal:
- move settlement behavior out of the generic mission engine
- let `resolveActionStep()` call a settlement adapter based on action type and route

### 2. Split registries into modular files
Suggested new folders:
- `client/src/lib/data/agents.ts`
- `client/src/lib/data/districts.ts`
- `client/src/lib/data/counterparties.ts`
- `client/src/lib/data/missions.ts`
- `client/src/lib/data/actionTypes.ts`
- `client/src/lib/data/events.ts`

Goal:
- make future content additions much easier
- let new agents, districts, and events be added without touching a giant file

### 3. Add backend persistence
Use the existing fullstack template already present in the repo.
Suggested goals:
- save run state
- save day reports
- save action receipts
- save unlocked rumors and faction changes

### 4. Add real testnet plumbing
Potential direction:
- use Stellar testnet only
- treat each action step as potentially chain-backed
- store tx hash on `ActionStep.stellarTxId`
- display explorer links in report UI
- keep fallback simulated mode if execution fails

### 5. Add event modularity
Current events are still heavily embedded in engine/data logic.
Future step:
- define events as pluggable objects with trigger conditions and outcomes
- allow counterparty-specific event packs
- allow district-specific event packs

## Product roadmap recommendation

### Milestone A
- settlement adapter layer
- receipt ledger UI
- modular content registries

### Milestone B
- testnet-backed premium intel
- permit filing as first real on-chain action
- explorer-linked receipts

### Milestone C
- richer faction systems
- rival brand behavior
- more counterparties and event packs
- persistent campaign progression

## Constraints to preserve

- keep the tone funny and commercially literate
- do not turn the game into a generic crypto dashboard
- do not make the UI feel like a protocol demo first and a game second
- preserve readability of mission reports
- preserve the visible agent → counterparty → outcome chain

## If handing off to another coding agent

Tell them:
- the repo already contains a working playable prototype
- do not start from scratch
- inspect `gameData.ts`, `gameEngine.ts`, and `MarketNetwork.tsx` first
- extend the settlement layer and modular data architecture next
- keep simulated mode working at all times
