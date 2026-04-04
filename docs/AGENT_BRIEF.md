# AGENT BRIEF

If another coding agent takes over, give them this brief.

## Project

The Velvet Ledger

## Current form

A playable browser prototype called The Velvet Ledger.
It is a funny market-management game where the player funds agents who interact with counterparties and return with reports.

## Core rule

Do not restart or re-concept the project.
Extend the current implementation.

## First files to inspect

- `README.md`
- `docs/HANDOFF.md`
- `docs/NEXT_STEPS.md`
- `client/src/lib/gameData.ts`
- `client/src/lib/gameEngine.ts`
- `client/src/components/MarketNetwork.tsx`
- `client/src/components/MissionComposer.tsx`
- `client/src/components/DailyReport.tsx`

## What matters most

- keep it funny and readable
- keep counterparties visible
- keep simulated mode working
- build toward Stellar testnet, not away from it
- make new events and systems easy to add

## Best next milestone

Implement a formal settlement adapter layer and a receipt ledger UI.

## Avoid

- turning the game into a pure crypto demo
- hiding the agent interaction chain
- coupling every gameplay system directly to live testnet calls
- rewriting the entire architecture without need
