# Stellar Integration

## Why Stellar fits

Stellar is useful here when we want agent actions to involve real payment primitives in a lightweight way.

The cleanest use is not "everything on-chain."
The cleanest use is selected paid actions.

## Good fit actions

- buying premium market intelligence
- paying district permit fees
- unlocking merchant negotiation channels
- paying for shipping priority
- settling a one-off trade execution fee
- paying for risk scans or authenticity checks

## MPP fit

MPP is a good fit when an agent wants to access a paid service and the game wants to show:
- challenge
- payment
- receipt
- outcome

In game terms:
- agent needs better trade info
- system offers paid feed
- agent spends budget
- service unlocks a better decision path
- report includes what was paid and why it mattered

## x402 fit

x402 is useful for service paywalls and monetized interactions.
Inside a game prototype, it can represent a machine-to-machine price gate for higher quality actions.

## Recommended architecture

### Phase 1
- simulate all money locally
- design the UX around budgets and receipts

### Phase 2
- introduce specific paid service endpoints
- wire agent actions to Stellar MPP charge flow
- attach receipt metadata to mission reports

### Phase 3
- optional testnet wallet-backed agent actions
- real transaction links in the report UI

## Principle

The money movement should serve the player fantasy.
Do not force chain logic into every system.
Use it where paying for action makes the agents feel real.
