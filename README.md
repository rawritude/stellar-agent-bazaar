# Stellar Agent Bazaar

Funny, funky market-management game concept built around agents, rumors, tiny budgets, and Stellar-native payment ideas.

## The Velvet Ledger Bazaar — First Playable

A single-player browser management game where you run a scrappy bazaar brand in a chaotic interplanetary market district. You fund and dispatch specialist agents — hagglers, vibe auditors, gossip crows in tiny waistcoats — into districts to trade, investigate, and cause incidents. They return with receipts, excuses, profit, losses, and dramatic reports.

### Play it

```bash
npm install
npm run dev
```

Then open [http://localhost:5000](http://localhost:5000) in your browser.

### How to play

1. **Morning Brief** — Review your cash, reputation, and the latest rumors.
2. **Start Planning** — Open the Mission Composer.
3. **Dispatch missions** — Pick a district, choose a mission type, assign an agent, set a budget and risk posture (cautious / balanced / reckless / theatrical).
4. **Resolve Day** — Your agents venture into the market. Events unfold.
5. **Read reports** — See what happened: money spent, money earned, narrative outcomes, intel gathered, side effects.
6. **Next Day** — Advance and repeat. Grow your brand. Try not to accidentally commit to 500 jars of haunted syrup.

### What's in the prototype

- **Day-based progression** with morning → planning → resolution → reports cycle
- **3 districts** — The Velvet Steps (luxury), The Fungal Quarter (underground), Festival Sprawl (carnival chaos)
- **5 agents** with distinct personalities, stats, quirks, and costs:
  - 🌶️ Pepper Jack, Senior Haggler
  - 🔮 Auntie Null, Vibe Auditor
  - 🐕 Ledger Pup 4, Reconciliation Unit
  - 🎩 The Marquis of Samples, Brand Ambassador Extraordinaire
  - 🐦‍⬛ Crow Unit Sigma, Intelligence Operative
- **9 mission types** across trade, branding, investigation, and scouting
- **Mission dispatch** with budget sliders and risk posture selection
- **Event resolution** with success/failure based on agent stats, budget, posture, and district danger
- **End-of-mission reports** showing money spent/earned, net P&L, narrative headlines, and side effects
- **Cash and reputation** visible in the UI at all times
- **Rumor feed** that grows as agents gather intel
- **Stellar integration hooks** — the Rumors tab shows where MPP/x402 premium intel would connect. Future versions can wire agent actions to Stellar testnet payments.

### Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Express backend (minimal — game logic is client-side)
- No database required for MVP — state lives in React

### Architecture

All game logic lives in pure TypeScript functions (`client/src/lib/gameEngine.ts`). Game data and types are in `client/src/lib/gameData.ts`. State management uses React `useReducer` via a context provider (`client/src/lib/gameContext.tsx`).

The game engine is designed so that Stellar integration can be layered in later without restructuring:
- Agent budgets map cleanly to payment allocations
- Mission dispatch → resolution → report mirrors a payment → service → receipt flow
- The "premium intel" hook in the Rumors tab is a natural MPP/x402 entry point

### Tone

Fantasy flea market meets startup dashboard. Polished UI with ridiculous copy. Roguelite merchant sim meets agent command center.

### Repo contents

- `client/` — React frontend (game UI, components, game engine)
- `server/` — Express server (minimal, serves the frontend)
- `shared/` — Shared TypeScript schemas
- `docs/` — Design documents and concept docs

## Design documents

- `docs/game-concept.md` — Premise, design goals, fantasy pillars
- `docs/game-loop.md` — Daily loop structure, moment-to-moment fun
- `docs/stellar-integration.md` — How Stellar fits, MPP/x402 ideas
- `docs/mvp.md` — MVP scope, non-goals, stretch goals
- `docs/ui-direction.md` — Visual references, core screens, interaction style
- `docs/event-writing.md` — Writing rules, event structure, examples
