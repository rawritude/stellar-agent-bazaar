# Stellar Agent Bazaar

Funny, funky market-management game concept built around agents, rumors, tiny budgets, and Stellar-native payment ideas.

## The Velvet Ledger Bazaar — Playable Prototype

A single-player browser management game where you run a scrappy bazaar brand in a chaotic interplanetary market district. You fund and dispatch specialist agents — hagglers, vibe auditors, gossip crows in tiny waistcoats — into districts to trade, investigate, and cause incidents. They negotiate with a network of colorful counterparties (merchants, guild offices, permit desks, data vendors) and return with receipts, excuses, profit, losses, and dramatic reports.

### Play it

```bash
npm install
npm run dev
```

Then open [http://localhost:5000](http://localhost:5000) in your browser.

### How to play

1. **Morning Brief** — Review your cash, reputation, network stats, and the latest rumors.
2. **Start Planning** — Open the Mission Composer.
3. **Dispatch missions** — Pick a district, choose a mission type, assign an agent, set a budget and risk posture (cautious / balanced / reckless / theatrical). The **Network Route Preview** shows which counterparties your agent will negotiate with.
4. **Resolve Day** — Your agents venture into the market network. They interact with counterparties step by step — negotiating with merchants, filing permits with guilds, purchasing intel from rumor bureaus, routing goods through logistics brokers.
5. **Read reports** — See what happened: the full **Interaction Trail** showing each counterparty step, money spent/earned per step, narrative outcomes, intel gathered, and side effects.
6. **Explore the Network** — Visit the Network tab to see all 9 counterparties, their reliability, greed, mood, supported actions, and settlement status.
7. **Next Day** — Advance and repeat. Counterparty moods shift. New rumors emerge. Grow your brand. Try not to accidentally commit to 500 jars of haunted syrup.

### What's in the prototype

**Core Gameplay**
- **Day-based progression** with morning → planning → resolution → reports cycle
- **3 districts** — The Velvet Steps (luxury), The Fungal Quarter (underground), Festival Sprawl (carnival chaos)
- **5 agents** with distinct personalities, stats, quirks, and costs:
  - 🌶️ Pepper Jack, Senior Haggler
  - 🔮 Auntie Null, Vibe Auditor
  - 🐕 Ledger Pup 4, Reconciliation Unit
  - 🎩 The Marquis of Samples, Brand Ambassador Extraordinaire
  - 🐦‍⬛ Crow Unit Sigma, Intelligence Operative
- **9 mission types** across trade, branding, investigation, and scouting

**Counterparty Network (NEW)**
- **9 counterparties** with personality, reliability, greed factor, mood, and quirks:
  - 🧑‍🍳 Madame Lentil's Emporium (Merchant)
  - 📜 The Guild of Ledgers (Guild Office)
  - 👺 The Permit Goblins (Permit Desk)
  - 👂 The Whisper Network (Rumor Bureau)
  - 🐪 Cart & Mule Logistics Co. (Logistics Broker)
  - 🔍 The Magnifying Order (Inspector)
  - 📊 Crows & Associates Data Bureau (Data Vendor)
  - 🕶️ The Shadow Desk (Rival Handler)
  - 📣 The Festival Criers Guild (Event Promoter)
- **8 modular action types**: Trade Execution, Paid Intel, Permit Filing, Inspection, Logistics, Brand Promotion, Negotiation, Sabotage Op
- **Two-sided resolution** — missions route through counterparties step-by-step based on action sequences
- **Counterparty mood shifts** between days (cooperative → neutral → hostile → chaotic)

**Settlement & Testnet Readiness**
- **Formal settlement adapter layer** (`client/src/lib/settlement/`) with `SettlementAdapter` interface
- **Simulated adapter** produces receipts with unique IDs, timestamps, fees, and flavor-text memos
- **Testnet adapter** with real `@stellar/stellar-sdk` integration and `STELLAR_OPERATION_MAP`:
  - Trade Execution → `manageSellOffer` (Stellar DEX order)
  - Paid Intel → `payment` (Stellar micropayment) — **canonical first testnet action**
  - Permit Filing → `manageData` (on-chain credential issuance)
  - Logistics → `createClaimableBalance` (escrow-backed delivery)
- **Receipt Ledger tab** — dedicated UI showing all settlement receipts with filters, volume stats, and fee tracking
- Every `ActionStep` now carries a `SettlementReceipt` with receipt ID, counterparty, amount, fee, memo, and future tx hash
- **Network stats tracking**: total transactions, counterparties used, settlement breakdown
- **Stellar Mode toggle** — one click to enable real testnet settlement from the Command Desk
- **Server-side settlement service** — Express API handles Stellar SDK calls, keeping keys server-side
- Architecture designed so new Stellar operations can be added per action type

**UI Features**
- 8-tab interface: Command Desk, Agents, Districts, **Network**, Missions, Reports, **Ledger**, Rumors
- **Network Route Preview** in Mission Composer shows counterparty routing before dispatch
- **Interaction Trail** in Reports shows each step with counterparty name, action type, success/failure, and cost
- **Market Network** panel shows all counterparties, their stats, action badges, and settlement indicators
- **Network status widget** on Command Desk with transaction count, node engagement, and top partner

### Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Express backend (minimal — game logic is client-side)
- No database required — state lives in React useReducer

### Architecture

All game logic lives in pure TypeScript functions:

- `client/src/lib/gameData.ts` — Types + initial data. Defines `Agent`, `District`, `MissionTemplate`, `Counterparty`, `ActionType`, `ActionStep`, `SettlementMode`, and the `GameState` shape.
- `client/src/lib/gameEngine.ts` — Pure functions for mission resolution. Key functions:
  - `findCounterparty()` — Matches action types to available counterparties in a district
  - `resolveActionStep()` — Resolves a single agent↔counterparty interaction and settles through the adapter
  - `resolveSingleMission()` — Resolves a full mission through its action sequence, producing an `ActionStep[]` trail with receipts
  - `resolveDay()` / `advanceDay()` — Day lifecycle with counterparty state threading
- `client/src/lib/settlement/` — Settlement adapter layer:
  - `types.ts` — `SettlementAdapter`, `SettlementRequest`, `SettlementReceipt`, `SettlementResult`
  - `simulated.ts` — Always-available simulated adapter
  - `testnet.ts` — Stellar testnet adapter with `STELLAR_OPERATION_MAP`
  - `index.ts` — Adapter router
- `client/src/lib/gameContext.tsx` — React context + useReducer for state management

**Adding new content is straightforward:**
- New counterparty → add to `INITIAL_COUNTERPARTIES` array
- New action type → add to `ActionType` union + `ACTION_TYPE_INFO` map
- New mission → add to a district's `availableMissions` with an `actionSequence`
- Stellar testnet → change `settlementMode` on counterparties from "simulated" to "testnet" — the adapter layer handles the rest. Wire real SDK calls in `client/src/lib/settlement/testnet.ts`.

### Tone

Fantasy flea market meets startup dashboard. Polished UI with ridiculous copy. Roguelite merchant sim meets agent command center. Every counterparty has a personality quirk and a dubious business practice.

### Repo contents

- `client/` — React frontend (game UI, components, game engine)
  - `components/MarketNetwork.tsx` — Counterparty network visualization
  - `components/CommandDesk.tsx` — Dashboard with network status widget
  - `components/MissionComposer.tsx` — Mission dispatch with network route preview
  - `components/DailyReport.tsx` — Reports with interaction trails and receipt IDs
  - `components/ReceiptLedger.tsx` — Settlement receipt ledger with filters and stats
- `server/` — Express server (minimal, serves the frontend)
- `shared/` — Shared TypeScript schemas
- `docs/` — Design documents and concept docs

## Handoff docs

- `docs/HANDOFF.md` — Full current-state handoff for another coding agent
- `docs/NEXT_STEPS.md` — Prioritized roadmap of what should be built next
- `docs/WORK_LOG.md` — Summary of what has already been completed
- `docs/AGENT_BRIEF.md` — Short brief to paste into another coding agent flow

## Design documents

- `docs/game-concept.md` — Premise, design goals, fantasy pillars
- `docs/game-loop.md` — Daily loop structure, moment-to-moment fun
- `docs/stellar-integration.md` — How Stellar fits, MPP/x402 ideas
- `docs/mvp.md` — MVP scope, non-goals, stretch goals
- `docs/ui-direction.md` — Visual references, core screens, interaction style
- `docs/event-writing.md` — Writing rules, event structure, examples
