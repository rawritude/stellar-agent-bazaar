# AGENT BRIEF

If another coding agent takes over, give them this brief.

## Project

The Velvet Ledger — a terminal roguelite where you run a trading brand in an interplanetary marketplace. Also an x402/MPP protocol playground on Stellar testnet.

## Current form

A fully playable browser game with real blockchain transactions, AI-generated agents and scenes, and a tuned 30-day campaign arc.

## Core rule

Do not restart or re-concept the project.
Extend the current implementation.

## First files to inspect

- `README.md`
- `docs/HANDOFF.md` — full architecture, known issues, next priorities
- `docs/DESIGN_GUIDELINES.md` — visual design system (CSS panels, braille art, color palette)
- `docs/PLAYTEST_NOTES.md` — latest audit results and balance data
- `client/src/lib/gameData.ts` — types, agents, counterparties, districts
- `client/src/lib/gameEngine.ts` — core game logic
- `client/src/lib/terminal/terminalMachine.ts` — screen state machine
- `server/game-master.ts` — RUBY token economy
- `server/mpp-services.ts` — real MPP counterparty endpoints

## What matters most

1. The game must be fun to play in a terminal
2. On-chain transactions must be real and verifiable
3. AI content must always have a fallback path
4. CSS for borders, braille for art, text for content — never box-drawing characters
5. Every change should be playtested (`npx tsx playtest.ts`)

## What NOT to do

- Don't use Unicode box-drawing characters for borders
- Don't add features without reading `DESIGN_GUIDELINES.md`
- Don't mock the blockchain — use real testnet transactions with simulated fallback
- Don't break the typewriter animation flow (check `TerminalShell.tsx`)
- Don't duplicate helpers — check `uiHelpers.ts` first
