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

**Optional:** Add your Anthropic API key to `.env` for AI-generated agents and dialogue:
```
ANTHROPIC_API_KEY=sk-ant-...
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

**Win condition:** Reach 80 reputation and 50 cash by Day 30.

**Lose condition:** Go bankrupt with no reputation. The bazaar moves on without you.

---

## The Cast

### Your Narrator

**Hakim, the Ledger-Keeper** -- Keeper of Receipts. Counter of Coins. Witness to Every Deal. He guides you through the game with a mix of wisdom, sarcasm, and questionable financial advice.

### Your Agents (AI-Generated)

Each playthrough generates unique agents via Claude Haiku with server-controlled rarity:

| Rarity | Stats | Animation | Drop Rate |
|--------|-------|-----------|-----------|
| Common | 8-14 peak | None | 60% |
| Uncommon | 15-21 peak | Teal pulse | 25% |
| Rare | 22-26 peak | Gold shimmer | 12% |
| Legendary | 27+ peak | Rainbow + sparkle | 3% |

Agents have specialties (trade, scout, investigation, branding, diplomacy), quirks, personal quests, and opinions about counterparties. They remember past interactions and will refuse to work with counterparties they distrust.

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

### The Rival

A competing brand appears in Week 2, randomly selected from four personality types:

| Style | Name | Catchphrase |
|-------|------|-------------|
| Aggressive | The Crimson Ledger | *"Every coin you earn is a coin I should have had."* |
| Cunning | Silk & Shadow Co. | *"I don't compete. I make you irrelevant."* |
| Charismatic | The Golden Mule Cartel | *"The merchants love me. Can they spell your name?"* |
| Ruthless | Obsidian & Ash Trading | *"Sentiment is for poets. This is business."* |

---

## Passkey Smart Accounts

No seed phrases. No extensions. One touch and you're in.

Uses [Smart Account Kit](https://github.com/nicholasgasior/smart-account-kit) to create Soroban smart contract wallets via WebAuthn passkeys. Your fingerprint or face scan creates and controls a Stellar testnet wallet. Game state saves to your wallet address.

---

## The x402 / MPP Protocol Playground

This game is a **live demonstration** of the x402 (HTTP 402 Payment Required) and MPP (Micro Payment Proofs) protocols on the Stellar network.

### What Gets Demonstrated

Every mission resolution simulates the full x402 flow:

```
  AGENT                          COUNTERPARTY SERVICE
    |                                    |
    |  1. GET /intel/premium             |
    |  --------------------------------> |
    |                                    |
    |  2. 402 Payment Required           |
    |     PaymentRequirements:           |
    |       asset: XLM                   |
    |       amount: 0.5                  |
    |       destination: GCOUNTERPARTY   |
    |  <-------------------------------- |
    |                                    |
    |  3. Stellar Payment                |
    |     (testnet transaction)          |
    |  ===============================>  |
    |                                    |
    |  4. GET /intel/premium             |
    |     X-Payment-Proof: <tx_hash>     |
    |  --------------------------------> |
    |                                    |
    |  5. 200 OK                         |
    |     { intel: "The spice is..." }   |
    |  <-------------------------------- |
```

### Which Actions Use x402

| Action Type | Stellar Operation | x402 Flow |
|-------------|-------------------|-----------|
| Trade Execution | `manageSellOffer` (DEX order) | Full |
| Paid Intel | `payment` (micropayment) | Full |
| Permit Filing | `manageData` (credential) | Full |
| Logistics | `createClaimableBalance` (escrow) | Full |

### Real Blockchain Integration

- **Passkey wallets** via Smart Account Kit (WebAuthn -- no seed phrases)
- **Stellar testnet** transactions with real tx hashes
- **SEP-50 NFTs** -- mint your agents as Soroban smart contract tokens
- **Receipt ledger** -- every transaction produces a verifiable receipt

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

| Week | Events |
|------|--------|
| 1 | Establish your brand. Learn the ropes. |
| 2 | Rival appears. Competition heats up. |
| 3 | Market crash. Prices tank. Survive. |
| 4 | Championship finals. Reach 80 rep to win. |

---

## Architecture

```
client/
  src/
    lib/
      gameData.ts         -- Types, agents, districts, counterparties
      gameEngine.ts       -- Pure async game logic (resolve, advance, shop, quests)
      gameContext.tsx      -- React state management (useReducer)
      settlement/         -- Settlement adapter layer (simulated + Stellar testnet)
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
  ai-engine.ts            -- Claude Haiku scene generation with guardrails
  agent-generator.ts      -- AI agent creation with server-side rarity
  stellar-settlement.ts   -- Real Stellar testnet payments
  x402.ts                 -- x402/MPP protocol simulation
  save-service.ts         -- SQLite save/load by wallet address
  nft-service.ts          -- Soroban NFT contract interaction
contracts/
  agent-nft/              -- Rust Soroban smart contract for SEP-50 NFTs
docs/
  DESIGN_GUIDELINES.md    -- Visual design system and rules
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + TypeScript |
| Terminal UI | Custom renderer with braille art, CSS panels, CRT effects |
| Backend | Express + SQLite |
| AI | Claude Haiku (via Anthropic API with tool_use) |
| Blockchain | Stellar SDK + Smart Account Kit + Soroban |
| Wallet | WebAuthn passkeys (no seed phrases) |
| Font | JetBrains Mono (Google Fonts) |

---

## Design Philosophy

```
  CSS      for borders, panels, glow, layout     (never breaks)
  BRAILLE  for illustrations and scene art        (32 vector assets)
  TEXT     for content, dialogue, stats            (colored spans)
  EMOJI    for inline icons                        (not art)
```

Two screen modes:
- **Panel screens** (data/management) -- CSS grid layouts with bordered panels
- **Text screens** (story/narrative) -- braille art + typewriter effect + animations

See [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md) for the full visual design system.

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
