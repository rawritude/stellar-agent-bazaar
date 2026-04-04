# HANDOFF

This document is for any future coding agent or developer taking over work on The Velvet Ledger.

## Project status

A fully playable terminal-based bazaar management game with real Stellar blockchain transactions, AI-generated content, and a tuned 30-day campaign arc.

### What's built

**Terminal UI**
- Page-based terminal interface (not scrolling — each screen replaces the previous)
- Braille art at every transition (splash, Hakim portrait, wallet, naming, agents, districts, events, win/lose)
- Typewriter animation for narrative screens, rarity animations for agents
- Panel layouts for data screens (morning brief, agent select, resolution, daily report)
- CSS-only borders and panels — no box-drawing characters
- Loading spinner with bazaar-themed messages
- Error boundary catches crashes

**On-Chain Economy (RUBY Token)**
- Game Master (`server/game-master.ts`) issues RUBY as a classic Stellar asset
- RUBY wrapped as Soroban SAC for MPP payments
- Every actor has a real Stellar testnet wallet: player (passkey), agents (derived), counterparties (derived), rival (derived)
- Counterparties funded with RUBY on GM initialization
- Agent wallets funded with RUBY before MPP requests
- Player receives 120 RUBY on game start
- All balances and transactions viewable on stellar.expert
- XLM used only for network fees

**MPP Integration**
- Real `@stellar/mpp` SDK for counterparty service endpoints (`server/mpp-services.ts`)
- Agent-side MPP client orchestrates full 402 flow (`server/mpp-agent.ts`)
- Falls back to local dice rolls if MPP unavailable or network is down
- Falls back to simulated result instead of hard 500 on errors

**Passkey Smart Accounts**
- Smart Account Kit passkey wallet (WebAuthn, requires HTTPS + hostname)
- Save/load game state by wallet address (SQLite)

**NFT Minting (SEP-50)**
- Soroban NFT contract deployed: `CAYN27RZZVAGNDXSBZYQP6DUOOCV36SZCOKS6SNKJWPNUD4LDXCGH22O`
- Agent stats, specialty, quirk encoded in token metadata
- Accessible via [X] from morning brief

**AI Systems**
- Claude Haiku scene generation with structured output (tool_use)
- Fuzzy enum matching + markdown fence stripping + fallback scenes (100% success rate)
- AI agent generation with server-side rarity control
- Mid-mission decision points (~30% of AI scenes)
- Daily budget tracking ($0.25/day cap)
- Prompt injection guardrails

**Game Systems**
- 30-day campaign arc (rival brand week 2, market crash week 3, championship week 4)
- Hakim's Emporium: 5 shop items with reputation gates and timed effects
- Agent quests: personal goals with stat_boost and cost_reduction rewards
- 4 rival personalities with real wallets, daily interference, catchphrases
- Counterparty trust system (-100 to +100, diminishing returns above 50)
- Agent memory, opinions, personality drift
- Scaled upkeep (6 base + week scaling + reputation tier)
- Scaled reputation decay (-1 low, -2 at 60+, -3 at 90+)
- 14 random events (Slay the Spire-style choices)
- Actionable rumors that trigger market events
- Comeback mechanic (30¤ emergency loan when broke)

**Testing & Balance**
- Vitest test suite covering settlement, AI guardrails, engine mechanics
- 3 automated playtest scripts: core engine (30 days), live server (10 days), AI scenes
- Balance tuned: cautious wins consistently, reckless is 50/50, mismatch is unstable

### Architecture

```
client/src/
  lib/
    gameData.ts          -- Types, initial data, agents, districts, counterparties
    gameEngine.ts        -- Pure async game logic (dispatch, resolve, advance)
    gameContext.tsx       -- React context + useReducer (state management)
    settlement/          -- Settlement adapters (simulated, testnet)
    terminal/
      terminalTypes.ts   -- Screen types, line/span/choice types
      terminalMachine.ts -- Screen-based state machine (pure function)
      terminalText.ts    -- All text content, braille art, screen builders
      uiHelpers.ts       -- Shared display helpers (cash, stats, greetings)
      brailleArt.ts      -- 32 vector-drawn braille art assets
      animations.ts      -- Animation engine (shimmer, sparkle, rainbow)
      useTerminal.ts     -- React hook bridging state machine to game context
    wallet/
      smartAccount.ts    -- Passkey wallet via Smart Account Kit
      agentNFT.ts        -- SEP-50 NFT minting on Soroban
    events/
      randomEvents.ts    -- 14 random events with trigger conditions
  components/
    terminal/
      TerminalShell.tsx  -- Main terminal renderer (CRT effects, typewriter)
      PanelLayouts.tsx   -- CSS panel layouts for data screens
      TerminalPanel.tsx  -- Reusable panel component

server/
    index.ts             -- Express + HTTPS server
    routes.ts            -- All API endpoints
    game-master.ts       -- RUBY token issuer, SAC deployment, economy control
    agent-wallets.ts     -- Agent/counterparty/rival wallet derivation + funding
    mpp-services.ts      -- Real MPP-protected counterparty service endpoints
    mpp-agent.ts         -- Agent-side MPP client (negotiation + payment)
    stellar-settlement.ts -- Direct Stellar testnet payments (fallback)
    ai-engine.ts         -- Scene generation with guardrails + fallback
    ai-prompts.ts        -- System prompts and tool schemas
    agent-generator.ts   -- AI agent generation (rarity-driven)
    rarity.ts            -- Server-side rarity rolls
    budget.ts            -- Daily API cost tracking
    save-service.ts      -- SQLite save/load by wallet
    nft-service.ts       -- Soroban NFT contract calls
    x402.ts              -- x402/MPP display flow generator

contracts/
    agent-nft/           -- Soroban NFT contract (Rust)
```

### How to run

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run dev
# → https://0.0.0.0:5000

# For passkey wallets, access via hostname (not IP):
# Add to browsing machine's /etc/hosts: 10.0.0.100  bazaar.local
# Then: https://bazaar.local:5000

# Tests
npm test

# Playtests
npx tsx playtest.ts                              # Core engine (30 days, 3 strategies)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx playtest-live.ts   # Live server (10 days)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx playtest-ai.ts     # AI scenes (5 days)
```

### Key design decisions

1. **Server-side randomness** — Rarity rolls, event selection, and budget tracking happen server-side. Players can't game the system.
2. **AI fills creativity, server controls mechanics** — Server decides rarity/stats, AI creates personality. Server validates output.
3. **Page-based terminal, not scrolling** — Each screen transition clears the display.
4. **CSS for structure, braille for art, text for content** — Never use box-drawing characters.
5. **Auto-save by wallet** — Game state saves after each day, keyed by wallet address.
6. **RUBY for value, XLM for fees** — All in-game currency is RUBY tokens on Stellar testnet.
7. **Always fall back gracefully** — MPP fails → dice rolls. AI fails → fallback scenes. Network down → simulated receipts.

### Known issues

- Passkey requires HTTPS + hostname (not IP addresses — WebAuthn spec limitation)
- Intel shop item purchased but no UI to display counterparty preferences
- Agent wallet surplus not returned after missions (`/api/agent-wallet/return-surplus` exists but isn't called)
- Panel layouts duplicate some helpers from uiHelpers.ts

### Next priorities

1. **Intel shop effect UI** — Show counterparty greed/reliability when Market Almanac is active
2. **Agent surplus return** — Call `/api/agent-wallet/return-surplus` after mission resolution
3. **Panel/helper consolidation** — Use uiHelpers.ts in PanelLayouts.tsx to eliminate duplication
4. **Balance iteration** — More playtesting, especially late-game difficulty curve
5. **Unlockable counterparties** — Hidden NPCs gated by achievements or quest completion
