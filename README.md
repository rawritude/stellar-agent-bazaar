```
                                                              
    _______ _            _   _      _            _           
   |__   __| |          | | | |    | |          | |          
      | |  | |__   ___  | | | | ___| |_   _____| |_         
      | |  | '_ \ / _ \ | | | |/ _ \ \ \ / / _ \ __|        
      | |  | | | |  __/ \ \_/ /  __/ |\ V /  __/ |_         
      |_|  |_| |_|\___|  \___/ \___|_| \_/ \___|\__|        
                                                              
    _                _                                        
   | |              | |                                       
   | |     ___  __ _| | __ _  ___  _ __                       
   | |    / _ \/ _` | |/ _` |/ _ \| '__|                      
   | |___|  __/ (_| | | (_| |  __/ |                          
   |______\___|\__,_|_|\__, |\___|_|                          
                        __/ |                                 
                       |___/                                  

```

> *"Every transaction is written among the stars. Every receipt tells a story.
> Every agent has an expense report that will make you weep."*
> **-- Hakim, the Ledger-Keeper**

---

## What Is This?

**The Velvet Ledger** is a single-player terminal roguelite where you run a scrappy trading brand in a chaotic interplanetary marketplace. You fund and dispatch specialist agents -- hagglers, vibe auditors, gossip crows in tiny waistcoats -- into spice-scented districts to trade, investigate, bribe, and cause incidents.

Your agents negotiate with a network of colorful counterparties. They return with receipts, excuses, profit, losses, and dramatic reports.

It's also an **x402 / MPP protocol playground** -- every in-game transaction demonstrates the HTTP 402 Payment Required flow and Micro Payment Proofs on the Stellar network. Real blockchain receipts. Play money only. Serious protocol demos wrapped in a ridiculous game.

**Mint your best agents as NFTs.** Your legendary haggler? That's a Soroban smart contract token now. Bring them to future runs. The stars remember.

<!-- Add a screenshot: save as docs/screenshot.png and uncomment -->
<!-- ![The Velvet Ledger](docs/screenshot.png) -->

```
   +---------------------------------------------------------+
   |  GENRE        Roguelite merchant sim meets terminal RPG  |
   |  PLATFORM     Browser (React + Vite + TypeScript)        |
   |  BLOCKCHAIN   Stellar testnet (passkey wallets, x402)    |
   |  AI ENGINE    Claude Haiku (agent generation, scenes)    |
   |  AESTHETIC    CRT terminal with braille art              |
   |  TONE         Fantasy flea market meets expense reports  |
   +---------------------------------------------------------+
```

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000). Connect your passkey. Meet your agents. Try not to go bankrupt.

**Optional `.env` configuration:**
```
ANTHROPIC_API_KEY=sk-ant-...   # AI-generated agents and dialogue (Claude Haiku)
GM_SECRET_KEY=S...              # Persistent Game Master keypair (auto-generated if missing)
RUBY_SAC_ADDRESS=C...           # RUBY token SAC address (auto-deployed if stellar CLI available)
```

---

## How to Play

```
  MORNING         Review cash, reputation, rumors, rival status.
     |             Visit Hakim's Emporium. Check agent quests.
     v
  PLANNING        Pick a district. Choose a mission. Assign an agent.
     |             Set a budget. Choose your risk posture.
     v
  RESOLUTION      Your agents venture into the market network.
     |             They negotiate with counterparties step by step.
     |             x402/MPP protocol exchanges settle each transaction.
     v
  REPORTS         See what happened: interaction trails, receipts,
     |             money spent per step, intel gathered, side effects.
     v
  NEXT DAY        Advance. Counterparty moods shift. Rivals scheme.
                   Random events fire. Reputation decays. Repeat.
```

**Win condition:** Reach 80 reputation and 50¤ cash by Day 30. Cautious play can get you there — but it won't be easy.

**Lose condition:** Go bankrupt with no reputation. The bazaar moves on without you.

---

## The Cast

### Your Narrator

**Hakim, the Ledger-Keeper** -- Keeper of Receipts. Counter of Coins. Witness to Every Deal. He guides you through the game with a mix of wisdom, sarcasm, and questionable financial advice.

### Your Agents (AI-Generated)

Each playthrough generates **3 unique agents** via Claude Haiku. The server rolls rarity first, then tells the AI what tier to create -- so nobody can game the system.

```
  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │  🗡️  Zara the Whisperer          [LEGENDARY]    │
  │      Shadow Broker                              │
  │                                                 │
  │  "I don't find secrets. Secrets find me.        │
  │   I just charge them rent."                     │
  │                                                 │
  │  Specialty:  Scout                              │
  │  Haggle:     +4       ░░░░░░░░░░                │
  │  Scout:      +28      ████████████████████████  │
  │  Charm:      -3       ░░░░░░░░░░                │
  │  Risk:       15%      Fee: 14¤                  │
  │                                                 │
  │  Quirk: Refuses to operate before sunset.       │
  │         Claims the shadows are "off" during     │
  │         daylight hours.                         │
  │                                                 │
  │  Quest: Eyes of the Bazaar                      │
  │         Complete 5 missions to unlock +3 Scout  │
  │                                                 │
  └─────────────────────────────────────────────────┘
```

**Five specialties,** each with a different strength:

| Specialty | Primary Stat | Role |
|-----------|-------------|------|
| Trade | Haggle | Better prices, cheaper deals |
| Scout | Scout | Find intel, spot opportunities |
| Investigation | Scout | Uncover scams, audit quality |
| Branding | Charm | Boost reputation, run promotions |
| Diplomacy | Charm | Smooth over conflicts, open doors |

**Every agent has:**
- **Three stats** (Haggle, Scout, Charm) -- positive means they're good, negative means they're bad. A legendary trader might have +28 Haggle but -15 Charm.
- **A quirk** -- a personality trait that makes them memorable. Generated by AI, never the same twice.
- **A personal quest** -- complete missions or hit milestones to unlock permanent stat boosts or fee reductions.
- **Opinions** -- agents remember counterparties they've worked with. Build trust and they perform better. Burn trust and they'll refuse to go back.
- **Morale** -- successes boost it, failures tank it. Low morale means worse performance.

**Rarity tiers** (server-controlled, AI-generated):

| Rarity | Peak Stat | Animation | Drop Rate |
|--------|-----------|-----------|-----------|
| Common | 8-14 | -- | 60% |
| Uncommon | 15-21 | Teal pulse | 25% |
| Rare | 22-26 | Gold shimmer | 12% |
| Legendary | 27+ | Rainbow + sparkle | 3% |

### The Counterparties

Nine colorful NPCs with personality, reliability, greed, and mood swings:

| | Name | Type | Vibe |
|---|------|------|------|
| :cook: | Madame Lentil's Emporium | Merchant | Tastes everything personally |
| :scroll: | The Guild of Ledgers | Guild Office | Forms require forms |
| :japanese_ogre: | The Permit Goblins | Permit Desk | Accept bribes in tea tins |
| :ear: | The Whisper Network | Rumor Bureau | Premium whispers cost extra |
| :camel: | Cart & Mule Logistics Co. | Logistics | Gerald the mule has veto power |
| :mag: | The Magnifying Order | Inspector | 47-point scale. Nobody knows why |
| :bar_chart: | Crows & Associates | Data Bureau | Optimistic vs Realistic pricing |
| :dark_sunglasses: | The Shadow Desk | Rival Handler | Notes under doors only |
| :mega: | Festival Criers Guild | Promoter | "Subtle" means 60% volume |

### The Rival (On-Chain Competitor)

A competing brand appears in Week 2 with its own **real Stellar wallet** and RUBY balance. Randomly selected from four personality types:

| Style | Name | Catchphrase |
|-------|------|-------------|
| Aggressive | The Crimson Ledger | *"Every coin you earn is a coin I should have had."* |
| Cunning | Silk & Shadow Co. | *"I don't compete. I make you irrelevant."* |
| Charismatic | The Golden Mule Cartel | *"The merchants love me. Can they spell your name?"* |
| Ruthless | Obsidian & Ash Trading | *"Sentiment is for poets. This is business."* |

The rival's wallet is viewable on stellar.expert. Their RUBY holdings, their transactions — all on-chain and verifiable.

---

## Passkey Smart Accounts

No seed phrases. No extensions. One touch and you're in.

Uses [Smart Account Kit](https://github.com/nicholasgasior/smart-account-kit) to create Soroban smart contract wallets via WebAuthn passkeys. Your fingerprint or face scan creates and controls a Stellar testnet wallet. Game state saves to your wallet address.

---

## The x402 / MPP Protocol Playground

This game is a **live implementation** of the [MPP (Machine Payments Protocol)](https://mpp.dev) on the Stellar network, using the [`@stellar/mpp`](https://github.com/stellar/stellar-mpp-sdk) SDK.

Every agent-to-counterparty interaction is a real MPP exchange with real Stellar testnet transactions, paid in **RUBY** tokens.

### How It Works

```
  AGENT (has wallet + RUBY budget)       COUNTERPARTY SERVICE (MPP server)
    |                                              |
    |  1. POST /api/service/paid_intel             |
    |  ------------------------------------------> |
    |                                              |
    |  2. 402 Payment Required                     |
    |     WWW-Authenticate: stellar-payment        |
    |     { amount: "5", asset: RUBY,              |
    |       destination: GCOUNTERPARTY... }         |
    |  <------------------------------------------ |
    |                                              |
    |  3. Agent AI decides: "Price is fair. Pay."  |
    |                                              |
    |  4. RUBY Payment (real Stellar testnet tx)   |
    |     Agent Wallet → Counterparty Wallet       |
    |  ==========================================> |
    |                                              |
    |  5. POST /api/service/paid_intel             |
    |     Authorization: stellar-payment <proof>   |
    |  ------------------------------------------> |
    |                                              |
    |  6. MPP SDK verifies payment on-chain        |
    |                                              |
    |  7. 200 OK + Payment-Receipt header          |
    |     { intel: "Spice prices are rising..." }  |
    |  <------------------------------------------ |
```

### Which Actions Use MPP

| Action Type | MPP Endpoint | Payment |
|-------------|-------------|---------|
| Paid Intel | `POST /api/service/paid_intel` | RUBY via SAC |
| Trade Execution | `POST /api/service/trade_execution` | RUBY via SAC |
| Permit Filing | `POST /api/service/permit_filing` | RUBY via SAC |
| Logistics | `POST /api/service/logistics` | RUBY via SAC |

### The On-Chain Economy

Every actor in the game has a real Stellar testnet wallet. Every transaction is verifiable on [stellar.expert](https://stellar.expert/explorer/testnet).

```
  GAME MASTER (server wallet)
    |  Issues RUBY token (Stellar classic asset, wrapped as Soroban SAC)
    |  Controls supply. Mints rewards. Funds all participants.
    |
    ├── PLAYER (passkey smart account)
    |     Holds RUBY balance = in-game cash
    |     XLM for network fees only
    |
    ├── AGENT 1-3 (derived keypairs)
    |     Funded with RUBY at mission dispatch
    |     Pay counterparties via MPP
    |     Return surplus to player
    |
    ├── 9 COUNTERPARTIES (deterministic keypairs)
    |     Hold RUBY reserves
    |     Receive MPP payments from agents
    |     Madame Lentil, Permit Goblins, etc.
    |
    └── RIVAL BRAND (deterministic keypair)
          Holds RUBY, competes on-chain
          Viewable on stellar.expert
```

All wallets, all transactions, all RUBY balances — real and verifiable.

---

## Mint Your Agents as NFTs (SEP-50)

Your agents aren't just game characters -- they're **mintable NFTs** on the Stellar network via a Soroban smart contract.

```
  +------------------------------------------------------+
  |  YOUR AGENT                   STELLAR NETWORK         |
  |                                                       |
  |  Zara the Whisperer     -->   SEP-50 Token            |
  |  [LEGENDARY Scout]           Contract: CAYN27R...     |
  |  Haggle: +28                  Token ID: #0042          |
  |  Scout: +12                   Owner: Your Passkey      |
  |  Charm: -3                    TX: 8f3a2b...            |
  |                                                       |
  |  Stats, quirks, and mission history                   |
  |  are encoded in the token metadata.                   |
  +------------------------------------------------------+
```

- **Mint from the game** -- press [X] from the morning brief to access the NFT screen
- **On-chain forever** -- your agent's stats, specialty, quirk, and history are stored in the Soroban contract
- **Import to future runs** -- bring your minted agents back to new playthroughs
- **Deployed contract:** `CAYN27RZZVAGNDXSBZYQP6DUOOCV36SZCOKS6SNKJWPNUD4LDXCGH22O` (Stellar testnet)

---

## Game Systems

### Hakim's Emporium (Shop)

Buy buffs between days. Items unlock as your reputation grows:

| Item | Cost | Effect |
|------|------|--------|
| Spice Tea | 15 | +10 morale to all agents |
| Pre-Approved Permits | 25 | 20% budget discount for 3 days |
| Gossip Network Sub | 30 | +5 reputation instantly |
| Market Almanac | 20 | Counterparty intel for 5 days (unlocks at rep 30) |
| Ward Against Rivals | 40 | Block rival interference for 3 days (unlocks at rep 50) |

### Agent Quests

Each agent has a personal quest based on their specialty. Complete missions or hit milestones to unlock stat boosts and fee reductions.

### Random Events (Slay the Spire-style)

40% chance each day. Merchant encounters, mysterious strangers, market disruptions, celebrations. Each event offers 2-3 choices with different risk/reward profiles.

### 30-Day Campaign Arc

| Week | Events | Difficulty |
|------|--------|------------|
| 1 | Establish your brand. Learn the ropes. | Upkeep: 6¤/day |
| 2 | Rival appears. Competition heats up. | Upkeep: 8¤/day |
| 3 | Market crash. Prices tank. Survive. | Upkeep: 10¤/day, rival accelerates |
| 4 | Championship finals. Reach 80 rep to win. | Upkeep: 12¤/day, rep decays faster |

---

## Architecture

```
client/
  src/
    lib/
      gameData.ts         -- Types, agents, districts, counterparties
      gameEngine.ts       -- Async game logic (MPP resolution, shop, quests)
      gameContext.tsx      -- React state management (useReducer)
      settlement/         -- Settlement adapter layer
      terminal/
        terminalTypes.ts  -- Screen types, line/span/choice types
        terminalMachine.ts-- Screen-based state machine (pure function)
        terminalText.ts   -- All text content, braille art, screen builders
        uiHelpers.ts      -- Shared display helpers (cash, stats, greetings)
        brailleArt.ts     -- 32 vector-drawn braille art assets
        animations.ts     -- Animation engine (shimmer, sparkle, rainbow, etc.)
        useTerminal.ts    -- React hook bridging state machine to game context
      wallet/
        smartAccount.ts   -- Passkey wallet via Smart Account Kit
        agentNFT.ts       -- SEP-50 NFT minting on Soroban
      events/
        randomEvents.ts   -- 14 random events with trigger conditions
    components/
      terminal/
        TerminalShell.tsx -- Main terminal renderer (CRT effects, typewriter)
        PanelLayouts.tsx  -- CSS panel layouts for data screens
        TerminalPanel.tsx -- Reusable panel component
server/
  game-master.ts          -- RUBY token issuer, SAC deployment, economy control
  agent-wallets.ts        -- Agent/counterparty/rival wallet derivation + funding
  mpp-services.ts         -- Real MPP-protected counterparty service endpoints
  mpp-agent.ts            -- Agent-side MPP client (negotiation + payment)
  ai-engine.ts            -- Claude Haiku scene generation with guardrails + fallback
  agent-generator.ts      -- AI agent creation with server-side rarity
  stellar-settlement.ts   -- Direct Stellar testnet payments (fallback)
  x402.ts                 -- x402/MPP display flow generator
  save-service.ts         -- SQLite save/load by wallet address
  nft-service.ts          -- Soroban NFT contract interaction
  routes.ts               -- All API endpoints (GM, MPP, wallets, AI, save/load)
contracts/
  agent-nft/              -- Rust Soroban smart contract for SEP-50 NFTs
docs/
  DESIGN_GUIDELINES.md    -- Visual design system and rules
```

---

## Contributing

The game is designed for easy content additions:

- **New counterparty** -- add to `INITIAL_COUNTERPARTIES` in `gameData.ts`
- **New action type** -- add to `ActionType` union + `ACTION_TYPE_INFO`
- **New mission** -- add to a district's `availableMissions` with an `actionSequence`
- **New random event** -- add to `RANDOM_EVENT_POOL` in `randomEvents.ts`
- **New braille art** -- add render function to `brailleArt.ts` (vector drawing primitives)
- **New shop item** -- add to `generateShopItems()` in `gameEngine.ts`

---

> *"The bazaar remembers all who pass through. The ledger forgets nothing.
> Now, shall we open for business?"*
> **-- Hakim**
