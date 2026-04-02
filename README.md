# Stellar Agent Bazaar

Funny, funky market-management game concept built around agents, rumors, tiny budgets, and Stellar-native payment ideas.

## Elevator pitch

You run a scrappy bazaar brand in a chaotic interplanetary market district.

You do not trade directly most of the time.
Instead, you fund and dispatch specialist agents:
- hagglers
- scouts
- smug diplomats
- spreadsheet goblins
- vibe readers
- counterfeit detectors
- gossip crows in tiny waistcoats

They go into the market, spend budget, make deals, gather rumors, trigger incidents, and return with receipts, excuses, profit, losses, and dramatic reports.

You then decide how to respond:
- double down on a product line
- blacklist a shady district
- reward a successful agent
- rotate strategy
- launch a campaign to grow your brand
- send another team out with a new budget and different risk posture

The game is not a perfect economic simulator.
It is a management toy with agent theater, economic pressure, and consequential decision-making.

## Why this is interesting on Stellar

This concept fits Stellar research in three ways:

- Agent budgets can be represented as small payment allocations.
- Market actions can be framed as paid interactions, service access, or settlement events.
- Agent reports create a natural loop around payment, verification, and next-step decisions.

MPP and x402 are not the whole game.
They are enabling mechanics for believable machine action:
- an agent pays to access premium market data
- an agent pays to secure a temporary stall permit
- an agent settles a one-off trade fee
- a district service charges for intelligence or logistics access
- a merchant unlocks a better quote after payment

The game can therefore showcase agents doing things with money rather than just chatting about doing things.

## Core fantasy

"I gave three weird little agents 25 credits and a bad idea, and somehow they came back with saffron futures, a celebrity endorsement, and two lawsuits."

## Core loop

1. Review your shop, cash, inventory, reputation, and incoming rumors.
2. Create or fund one or more agent missions.
3. Agents travel into market zones and encounter merchants, risks, and opportunities.
4. They spend or conserve budget based on role, confidence, and your instructions.
5. They return with outcomes, receipts, rumors, and side effects.
6. You react by reallocating budget, changing policy, hiring, firing, bribing, branding, or expanding.
7. New districts and hazards unlock as your business grows.

## Tone

The tone should be:
- funny
- mildly unhinged
- commercially literate
- readable
- playful but not random
- rich with event text and post-mission reports

Think:
- fantasy flea market meets startup dashboard
- roguelite merchant sim meets agent command center
- polished UI with ridiculous copy

## Best concept direction

The strongest version is:

### The Velvet Ledger Bazaar

A strange market-city where every district has its own rules, fees, rumors, and brand culture.

You are not an emperor.
You are a growing merchant operator trying to become a legendary brand.

You manage:
- products
- pricing
- field agents
- stall upgrades
- supplier relationships
- rumors
- district access
- reputation by faction
- cashflow under uncertainty

Your agents are semi-autonomous and have distinct personalities.
They do not always do what you expected.
That creates the fun.

## Example agents

- Pepper Jack, Senior Haggler
  - gets better prices
  - sometimes insults nobles
- Auntie Null, Vibe Auditor
  - identifies scams and fake demand
  - occasionally causes morale collapse with brutal honesty
- Ledger Pup 4
  - amazing at reconciliation
  - can be distracted by shiny stamps
- The Marquis of Samples
  - excellent for brand awareness missions
  - extremely expensive and may improvise catastrophically
- Crow Unit Sigma
  - gathers rumors cheaply
  - confidence level unjustifiably high

## Example missions

- Source cinnamon below target margin
- Test premium lantern demand in the Velvet Steps district
- Pay for access to a merchant forecast feed
- Negotiate a temporary supply contract
- Investigate whether a rival is faking scarcity
- Open a pop-up stall during festival week
- Bribe the mushroom inspectors legally-ish
- Sponsor a parade float to improve brand affection

## Good things that can happen

- huge margin deal
- exclusive supplier access
- brand craze in a rich district
- discounted logistics route
- agent discovers counterfeit rival stock
- rumor market tips you into a profitable category early
- funny celebrity endorsement

## Bad things that can happen

- your agent overpays due to fake urgency
- a rival spreads anti-brand slander
- spoilage, theft, taxes, inspections, weather, weird customs duties
- your top agent develops an ego problem
- a district bans your mascot
- you win a negotiation and accidentally commit to 500 jars of haunted syrup

## Suggested UI

The best app structure is a stylized management dashboard with theatrical panels:

- Bazaar map
- Agent roster
- Mission composer
- Live mission feed
- Merchant cards
- Budget sliders
- Receipt log
- Rumor ticker
- Reputation matrix
- End-of-day report
- Incident drawer

## Suggested first playable slice

A strong first milestone would include:
- one city
- three districts
- five agents
- six merchant types
- one simple product economy
- mission dispatch
- event resolution
- report cards
- a day cycle
- basic brand reputation

## Stellar integration ideas

### Lightweight mode
- purely simulated budgets and payments
- UI demonstrates where MPP/x402 would fit
- ideal for rapid prototype

### Showcase mode
- some market services are paid endpoints
- agents use MPP charge to unlock data or actions
- receipts appear in mission reports
- ideal for demos

### Full experiment mode
- each agent gets a real wallet or spending authority
- certain actions settle through Stellar testnet
- mission logs include transaction receipts
- funniest and most ambitious option

## Recommendation

Start with a web game / management app that is playable without chain dependence.
Then layer in optional paid agent actions using Stellar MPP for specific premium interactions.
That gives us:
- a fun toy first
- a believable agent-money story second
- a better demo than a chain-first design

## Repo contents

- `docs/game-concept.md`
- `docs/game-loop.md`
- `docs/stellar-integration.md`
- `docs/mvp.md`
- `docs/ui-direction.md`
- `docs/event-writing.md`

## Proposed next step

Build a first repo milestone as a single-player browser management game with:
- turn-based day loop
- dispatchable agents
- event cards
- profit/reputation outcomes
- mission report UI
- optional Stellar-powered premium actions later
