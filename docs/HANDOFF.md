# HANDOFF

This document is for any future coding agent or developer taking over work on Stellar Agent Bazaar.

## Project status

The project is no longer just a concept repo.
It is now a playable browser prototype called The Velvet Ledger Bazaar with a two-sided market interaction model and a formal settlement adapter layer.

Current state:
- concept repo created
- first playable single-player prototype built
- counterparty network architecture added
- README updated to explain the playable prototype and market network
- codebase structured so future Stellar testnet settlement can be layered in
- **settlement adapter abstraction implemented** (simulated + testnet adapters)
- **receipt ledger UI added** — new Ledger tab shows all settlement receipts
- **every action step now produces a SettlementReceipt** with receipt ID, timestamp, memo, and fee
- **paid_intel is the canonical first testnet-ready action** with Stellar operation mapping
- **real Stellar testnet payments working** — `paid_intel` executes real XLM payments on Stellar testnet
- **server-side StellarSettlementService** with wallet management, friendbot funding, counterparty account creation
- **API endpoints**: `GET /api/wallet`, `POST /api/wallet/fund`, `POST /api/settle`
- **Stellar Mode toggle** in Command Desk UI — one click to enable testnet settlement
- **explorer links** in Receipt Ledger for testnet transactions
- **vitest test suite** — 52 tests covering settlement adapters, Stellar service, real testnet payments, engine integration, and full game loop

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
  - `ActionStep` now includes optional `receipt: SettlementReceipt`
- `client/src/lib/gameEngine.ts`
  - pure mission resolution
  - routing through counterparties
  - step-by-step action resolution with settlement adapter delegation
  - day resolution and progression
- `client/src/lib/gameContext.tsx`
  - reducer-backed React state
- `client/src/lib/settlement/` — **NEW: settlement adapter layer**
  - `types.ts` — `SettlementAdapter`, `SettlementRequest`, `SettlementReceipt`, `SettlementResult` interfaces
  - `simulated.ts` — always-available simulated adapter with flavor-text memos
  - `testnet.ts` — Stellar testnet adapter with operation mapping (SDK calls stubbed)
  - `index.ts` — adapter router (`getSettlementAdapter(mode)`)

### Server-side Stellar service
- `server/stellar-settlement.ts` — `StellarSettlementService` class
  - Manages testnet keypairs, funds via friendbot
  - Creates counterparty accounts on testnet
  - Builds, signs, and submits real Stellar payment transactions
  - Falls back to simulated receipts on failure
- `server/routes.ts` — API endpoints: `/api/wallet`, `/api/wallet/fund`, `/api/settle`

### Test suite (52 tests)
- `client/src/lib/settlement/settlement.test.ts` — simulated adapter, testnet adapter, router
- `client/src/lib/settlement/testnet.test.ts` — paid_intel testnet path, operation mapping
- `client/src/lib/gameEngine.test.ts` — baseline engine tests + settlement receipt integration (async)
- `server/stellar-settlement.test.ts` — wallet init, counterparty addresses, settle flow, friendbot funding
- `server/routes.test.ts` — API contract tests + **real Stellar testnet payment test**

### UI already in place
- `client/src/pages/game.tsx`
  - main shell with 8-tab navigation (Command, Agents, Districts, Network, Missions, Reports, **Ledger**, Rumors)
- `client/src/components/CommandDesk.tsx`
  - main dashboard and status widgets
- `client/src/components/AgentRoster.tsx`
  - agent cards and stats
- `client/src/components/DistrictMap.tsx`
  - district overview
- `client/src/components/MissionComposer.tsx`
  - dispatch flow and network route preview
- `client/src/components/DailyReport.tsx`
  - report cards and interaction trails (now shows receipt IDs)
- `client/src/components/MarketNetwork.tsx`
  - visible network layer for counterparties and action types
- `client/src/components/ReceiptLedger.tsx` — **NEW**
  - dedicated receipt ledger with filters (action type, settlement mode)
  - volume stats, fee tracking, receipt detail cards
  - testnet readiness banner
  - receipt IDs, timestamps, flavor memos
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
- all settlement (through formal `SimulatedSettlementAdapter`)
- all counterparty interactions
- all rumors and event outcomes
- all financial state

### Real today
- playable UI and game loop
- modular data model for counterparties and action types
- visible network and settlement-readiness framing
- architecture for two-sided interactions
- **settlement adapter abstraction** — `SettlementAdapter` interface, simulated and testnet implementations
- **receipt generation** — every action step produces a `SettlementReceipt`
- **receipt ledger UI** — filterable view of all transaction receipts with explorer links
- **real Stellar testnet payments** — `paid_intel` executes real XLM payments via `StellarSettlementService`
- **server-side settlement** — Express API for Stellar transaction execution (keeps keys server-side)
- **Stellar Mode toggle** — UI widget to enable/disable testnet settlement with one click
- **testnet adapter structure** — `STELLAR_OPERATION_MAP` defines how each action maps to a Stellar operation

## Important design decisions already made

1. The game should remain fun without live chain dependency.
2. The chain should enhance selected actions, not dominate every system.
3. Counterparties are first-class objects in the game model.
4. Missions should produce readable report trails, not hidden calculations.
5. Future expansion should mostly mean adding data and adapters, not rewriting engine structure.

## Known gaps

The following has not yet been built:
- ~~actual Stellar testnet settlement adapter~~ **DONE** — real Stellar SDK integration working
- ~~real receipt ledger panel with tx hashes~~ **DONE** — Ledger tab with receipt detail cards and explorer links
- ~~actual Stellar SDK integration~~ **DONE** — `@stellar/stellar-sdk` wired into server-side service
- persistent save/load state via backend or DB
- externalized event registry separate from gameData monolith
- modular counterparty packs loaded from separate files
- on-chain execution log / explorer links (receipt IDs exist, explorer links need real tx hashes)
- agent memory / history over multiple days beyond lightweight current stats
- backend orchestration for deterministic or replayable simulations

## Immediate next recommendation

The settlement adapter layer and receipt ledger are now in place.
The next coding agent should focus on **wiring real Stellar SDK calls** and **splitting content registries**.

Recommended next milestone:
1. Install `stellar-sdk` and implement real testnet payments in `testnet.ts`
2. Start with `paid_intel` — the adapter structure and operation mapping are ready
3. Add explorer links to ReceiptLedger for testnet receipts
4. Split `gameData.ts` registries into modular files
5. Add backend persistence for receipts and game state

## Suggested technical next steps

### 1. Wire real Stellar SDK into testnet adapter
The adapter at `client/src/lib/settlement/testnet.ts` already has:
- `STELLAR_OPERATION_MAP` mapping `paid_intel` → `payment` operation
- structured comments showing exactly where SDK calls go
- fallback to simulated mode on failure

Next steps:
- `npm install stellar-sdk`
- Implement `settlePaidIntel()` in `testnet.ts` using the Stellar SDK
- Build, sign, and submit a real payment to Stellar testnet
- Populate `receipt.stellarTxId` with the actual tx hash
- Add explorer links in ReceiptLedger UI

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
- save action receipts (with settlement mode and tx hashes)
- save unlocked rumors and faction changes

### 4. Add event modularity
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
