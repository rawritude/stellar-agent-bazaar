# WORK LOG

## Completed

### Repo foundation
- Created the initial public repository
- Added concept README and design docs
- Established the market-management game direction

### First playable prototype
- Built a playable browser game called The Velvet Ledger Bazaar
- Added day-based progression
- Added 3 districts, 5 agents, 9 mission templates
- Added mission dispatch, resolution, and report flow
- Added funny narrative outcomes and rumors

### Two-sided market model
- Added counterparties as first-class game entities
- Added 9 counterparties / market nodes
- Added 8 modular action types
- Refactored mission resolution to flow through counterparties
- Added Network tab and route preview
- Added interaction trails in reports
- Updated README with architecture notes

### Settlement adapter layer and receipt ledger
- Created formal settlement adapter abstraction
- Extended ActionStep with SettlementReceipt
- Built ReceiptLedger.tsx with filters and stats
- Added Ledger tab to game shell
- Set up vitest test infrastructure

### Real Stellar testnet integration
- Installed @stellar/stellar-sdk
- Built StellarSettlementService with friendbot funding
- Added API endpoints (wallet, settle, fund)
- Made game engine async for network settlement
- Added Stellar Mode toggle to Command Desk
- Real testnet payments confirmed on explorer

### Terminal UI transformation
- Replaced tab-based dashboard with page-based terminal interface
- Created Hakim the Ledger-Keeper narrator with ASCII portrait
- Built state machine for screen flow (splash → intro → wallet → name → agents → game loop)
- Added panel layouts (morning brief dashboard, agent select, resolution, daily report)
- Added ASCII art for all setup screens, districts, events, win/lose
- Added specialty portraits for AI-generated agents (trade/scout/branding)

### AI integration
- Claude Haiku scene generation with tool_use structured output
- AI agent generation with server-side rarity control
- Mid-mission decision points in AI scenes (~30%)
- Daily budget tracking ($0.25/day per wallet)
- Prompt injection guardrails (sanitization, validation, bounded modifiers)

### Stellar advanced features
- x402/MPP protocol exchange visible in settlement flow
- Smart Account Kit passkey wallet (WebAuthn)
- SEP-50 NFT contract deployed on Soroban testnet
- Agent minting as on-chain NFTs
- HTTPS server with self-signed certs for passkey support

### Game systems
- 30-day campaign arc (rival brand, market crash, championship)
- Counterparty trust system (-100 to +100)
- Agent memory and opinions (refusals, personality drift)
- Daily upkeep with comeback mechanic
- 12 Slay the Spire-style random events with choices
- Actionable rumors triggering market events
- Reputation decay forcing active play
- Save/load by wallet address (SQLite)

### Animation system
- 12 animation types (rainbow, shimmer, typewriter, spinner, particles, etc.)
- Rarity animations on agent reveals
- Typewriter for narrative screens
- Loading spinner with bazaar-themed messages
- Win/lose screen animations

### Balance tuning (from 3 playtests)
- Fixed counterparty trust fields (was broken for 8 of 9)
- Fixed rival reputation operator precedence bug
- Fixed cash accounting in daily reports
- Rebalanced all 9 mission reward/cost ratios
- Tuned reputation gains, morale losses, upkeep curve
- Added emergency comeback mechanic
- Raised starting cash to 120

### Error handling
- React error boundary catches crashes with styled error page
- Null guards on all new state fields
- Defensive checks in dispatch/resolve flows

## Not yet started

- Rival brand as a character (personality, dialogue, interference)
- Agent personal quests / story arcs
- Shop system (items, equipment, consumables)
- Unlockable counterparties
- Agent leveling / specialization
- Cut dead code (opinion tracking, unused mood mechanics)
- More random events (pool of 30+)
- Full Soroban NFT integration in game flow
