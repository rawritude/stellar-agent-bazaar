# NEXT STEPS

This document lists the work that should happen next in priority order.

## Priority 1

### Build settlement adapters

Goal:
Introduce a formal settlement abstraction so action steps can run through either simulated logic or Stellar testnet execution.

Deliverables:
- settlement adapter interface
- simulated adapter
- testnet adapter stub or first real implementation
- engine updated to call adapters instead of embedding settlement logic directly

Why:
This is the cleanest bridge from today's prototype to the desired on-chain future.

## Priority 2

### Add receipt ledger UI

Goal:
Give players and future developers a dedicated place to inspect action receipts.

Deliverables:
- new ledger or receipts tab
- list of action steps with settlement mode, cost, success, and tx hash when available
- explorer links for testnet-backed actions

Why:
Receipts are central to the product fantasy.
They also make the game better at teaching how agents and payments interact.

## Priority 3

### Split the content registries

Goal:
Make the project easier to extend.

Deliverables:
- move agents, missions, counterparties, action metadata, and event text into separate modules
- keep imports clean and centralized

Why:
The project is currently easy to understand but gameData is becoming large.
Future-proofing means modular registries.

## Priority 4

### Add modular event packs

Goal:
Make events easy to add without touching core engine logic.

Deliverables:
- event definition schema
- trigger conditions
- action hooks
- district packs
- counterparty packs

Why:
The user explicitly asked for future-proof event extensibility.

## Priority 5

### Add persistence

Goal:
Allow campaigns to continue across reloads and eventually support richer progression.

Deliverables:
- backend persistence model
- save/load endpoints
- saved daily reports and receipts
- saved counterparty state

Why:
The current prototype is playable but not campaign-grade yet.

## Priority 6

### Add first real testnet-backed action

Recommended first candidate:
`paid_intel`

Why this is the best first on-chain action:
- small and bounded
- easy to explain
- natural fit with MPP/x402
- clean receipt story
- low risk to the broader game loop

Potential user story:
- agent pays a premium intel bureau on Stellar testnet
- the bureau returns a higher-value rumor or forecast
- the mission report includes a receipt and transaction hash

## Priority 7

### Add brand and faction depth

Potential features:
- district factions
- brand archetypes
- rivals with recurring behaviors
- supplier trust
- blacklisting and soft power

Why:
These deepen strategic play after the payment and infrastructure layers are in place.

## Architectural principles for all future work

- keep simulated fallback available
- add new systems through explicit interfaces
- keep mission reports understandable
- make counterparties visible in the UI
- avoid hiding chain logic behind vague abstractions
- every on-chain action should improve the player fantasy, not just prove that a transaction happened
