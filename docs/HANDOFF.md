# HANDOFF

This document is for any future coding agent or developer taking over work on The Velvet Ledger.

## Project status

A fully playable terminal-based bazaar management game with Stellar blockchain integration, AI-generated content, and a 30-day campaign arc.

### What's built

**Terminal UI**
- Page-based terminal interface (not scrolling — each screen replaces the previous)
- ASCII art at every transition (splash, Hakim portrait, wallet, naming, agents, districts, events, win/lose)
- Typewriter animation for narrative screens, rarity animations for agents
- Panel layouts for data screens (morning brief, agent select, resolution, daily report)
- Loading spinner with bazaar-themed messages
- Error boundary catches crashes instead of white screening

**Stellar Integration**
- Real Stellar testnet payments via `StellarSettlementService`
- x402/MPP protocol exchange visible in settlement flow
- Smart Account Kit passkey wallet (WebAuthn, requires HTTPS + hostname)
- SEP-50 NFT contract deployed on Soroban: `CAYN27RZZVAGNDXSBZYQP6DUOOCV36SZCOKS6SNKJWPNUD4LDXCGH22O`
- Agent minting as on-chain NFTs
- Save/load game state by wallet address (SQLite)

**AI Systems**
- Claude Haiku scene generation with structured output (tool_use)
- AI agent generation with server-side rarity control
- Mid-mission decision points (~30% of AI scenes)
- Daily budget tracking ($0.25/day cap per wallet)
- Prompt injection guardrails (sanitization, validation, bounded modifiers)

**Game Systems**
- 30-day campaign arc (rival brand, market crash, championship)
- Counterparty trust system (-100 to +100, affects pricing and availability)
- Agent memory and opinions (refusals, personality drift)
- Daily upkeep (6¤ base, +1/week) with comeback mechanic (30¤ emergency loan)
- 12 random events (Slay the Spire-style, between-day, with choices and permanent consequences)
- Actionable rumors that trigger market events
- Reputation decay (-1/day, forces active play)
- Rarity system: 60% common, 25% uncommon, 12% rare, 3% legendary

**Testing**
- 80 vitest tests covering settlement, AI guardrails, engine mechanics
- Automated playtesting scripts with balance reports
- Game audit and ASCII evaluation documents

### Architecture

```
client/src/
  lib/
    gameData.ts          — Types, initial data, agents, districts, counterparties
    gameEngine.ts        — Pure async game logic (dispatch, resolve, advance)
    gameContext.tsx       — React context + useReducer (state management)
    settlement/          — Settlement adapters (simulated, testnet, x402)
    terminal/            — Terminal UI state machine, text, animations, types
    wallet/              — Smart Account Kit, agent NFTs
    events/              — Random event pool
  components/
    terminal/            — TerminalShell, PanelLayouts, TerminalPanel
  pages/
    terminal.tsx         — Main game page (with error boundary)

server/
    index.ts             — Express + HTTPS server
    routes.ts            — All API endpoints
    stellar-settlement.ts — Stellar SDK service
    ai-engine.ts         — Scene generation with guardrails
    ai-prompts.ts        — System prompts and tool schemas
    agent-generator.ts   — AI agent generation (rarity-driven)
    rarity.ts            — Server-side rarity rolls
    budget.ts            — Daily API cost tracking
    save-service.ts      — SQLite save/load by wallet
    nft-service.ts       — Soroban NFT contract calls
    x402.ts              — x402/MPP protocol simulation

contracts/
    agent-nft/           — Soroban NFT contract (Rust)
```

### How to run

```bash
# Install
npm install

# Add API key to .env
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Run (HTTPS for passkey support)
npm run dev
# → https://0.0.0.0:5000

# For passkey wallets, access via hostname (not IP):
# Add to browsing machine's /etc/hosts: 10.0.0.100  bazaar.local
# Then: https://bazaar.local:5000

# Tests
npm test
```

### Key design decisions

1. **Server-side randomness** — Rarity rolls, event selection, and budget tracking happen server-side. The client never sees the internal parameters. Players can't game the system.
2. **AI fills in creativity, server controls mechanics** — The server decides "generate a RARE scout with stats 22-26." The AI creates the personality. The server validates the output.
3. **Page-based terminal, not scrolling** — Each screen transition clears the display. No scroll history.
4. **Passkey wallet required** — No simulated mode. Wallet connection gates game start.
5. **Auto-save by wallet** — Game state saves to SQLite after each day, keyed by wallet address.

### Known issues

- White screen on dispatch/resolve in some browser configurations (error boundary now catches and displays the error)
- Passkey requires HTTPS + hostname (not IP addresses — WebAuthn spec limitation)
- Agent opinions tracked but not displayed to player
- Random event effects applied in UI but `resolveRandomEvent()` not in engine (effects applied via game context reducer)
- Rival brand is numbers only, no personality or interference mechanics yet

### Next priorities

1. **Make the rival a character** — name, dialogue, interference, sabotage
2. **Agent personal quests** — mini story arcs per agent
3. **Shop system** — rotating items between days
4. **Unlockable counterparties** — hidden NPCs gated by achievements
5. **Cut dead code** — agent opinion system, unused mood mechanics
