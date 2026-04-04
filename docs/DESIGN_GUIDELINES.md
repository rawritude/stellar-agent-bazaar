# Design Guidelines — The Velvet Ledger

## Core Principle

We are a browser app styled as a terminal. We have the full power of HTML, CSS, and JavaScript. We should use each technology for what it's best at:

- **CSS** → borders, panels, glow effects, shadows, layout, animation
- **Braille art** → detailed scene illustrations (buildings, characters, objects)
- **Plain text + emoji** → content, dialogue, stats, labels
- **CSS animations** → CRT effects, glow pulses, transitions

## What NOT to do

- ❌ Never use Unicode box-drawing characters (╔═╗║) for borders — they break across fonts
- ❌ Never use multi-span lines to "draw" borders with characters
- ❌ Never align text using spaces to match character-drawn frames
- ❌ Never use ASCII characters (+, |, -, =) to make boxes

## The Three Layers

### Layer 1: CSS Panels (borders, frames, containers)

All visual containers use CSS. The `TerminalPanel` component handles this:
- `border: 1px solid <color>` for frames
- `box-shadow: 0 0 8px <color>40` for glow effects
- `background: <color>08` for subtle fills
- `border-radius: 2px` for slight rounding (terminal feel, not rounded)
- `padding` and `margin` in `ch` units (character-width based)

Panels are React components, not text art. They never break.

### Layer 2: Braille Art (illustrations)

For detailed visual scenes, use the braille renderer (`brailleArt.ts`):
- Each character is a 2x4 pixel grid (high resolution)
- Draw with vector primitives (circles, lines, arcs, stars)
- Always single-color per line (never multi-span for art)
- Minimum 120x48 pixel canvas (60 chars wide, 12 lines)
- Maximum 160x72 pixel canvas (80 chars wide, 18 lines)

When to use braille:
- Scene-setting moments (splash, Hakim entrance, events)
- Location art (bazaar, marketplace, alley)
- Character portraits (Hakim, rival)
- Objects (treasure chest, trophy, ledger)

### Layer 3: Text Content (everything else)

All text uses the span system with color tokens:
- Single span per concept (don't split a name across spans)
- Color conveys meaning, not decoration
- Bold for emphasis, not for headers (headers use size via CSS)
- Emoji as inline icons, not art elements

## Color Palette

| Token | Hex | Use |
|-------|-----|-----|
| gold | #d4a843 | Currency, brand, Hakim's speech |
| amber | #c8a02e | Highlighted choices, warm accents |
| teal | #5cb8a5 | Stellar/blockchain/settlement |
| green | #6bc76b | Success, profit, trust |
| red | #e25555 | Failure, danger, loss |
| purple | #a87cc4 | Reputation, rarity, mystery |
| cyan | #62c8d8 | Agent names, info labels |
| orange | #d49040 | Warnings, risk, events |
| dim | #706858 | Secondary text, flavor |
| white | #e0ddd5 | Primary text (parchment-tinted) |

## CSS Effects

### Glow (for titles, important moments)
```css
text-shadow: 0 0 7px currentColor, 0 0 14px currentColor;
```

### Panel glow (for highlighted panels)
```css
box-shadow: 0 0 12px #d4a84330, inset 0 0 4px #d4a84310;
```

### CRT scanlines (subtle, on the main container)
```css
background-image: repeating-linear-gradient(
  0deg,
  rgba(0,0,0,0.03),
  rgba(0,0,0,0.03) 1px,
  transparent 1px,
  transparent 2px
);
```

### Vignette (edges of screen darken)
```css
box-shadow: inset 0 0 100px rgba(0,0,0,0.3);
```

## Text Formatting Rules

### Titles
- Use CSS font-size, not spaced-out letters
- Glow effect via text-shadow
- Color: gold
- Example: `<span style="fontSize: '1.4em', textShadow: '0 0 10px #d4a843'">The Velvet Ledger</span>`

### Dividers
- Use CSS `<hr>` or `border-top` on a div
- Never draw dividers with repeated characters
- Color: dim, thin

### Character names
- Emoji + name on one line
- Color: cyan for agents, white for counterparties
- Bold for the name only

### Stats
- Plain text with color coding
- Green for positive, red for negative
- No bars made of characters — use CSS width/background if needed

## Asset Sizes

| Asset | Braille Canvas | Output Size | When Used |
|-------|---------------|-------------|-----------|
| Splash scene | 160x72 | 80ch × 18 lines | Game start |
| Hakim portrait | 120x64 | 60ch × 16 lines | Intro, key moments |
| Event scene | 100x40 | 50ch × 10 lines | Random events |
| Small icon | 40x16 | 20ch × 4 lines | Inline moments |
| Trophy | 80x48 | 40ch × 12 lines | Win screen |

## Screen Types: Panel vs Text

The game has two rendering modes. Each screen must use exactly one.

### Panel Screens (data/management)

Use CSS `TerminalPanel` + `PanelGrid` layouts. These show structured data:
- `morning_brief` — Dashboard: greeting + treasury + agents + rumors
- `choose_agent` — Selection: agent cards + mission sidebar
- `resolution_narrative` — Log: step-by-step results + financials sidebar
- `daily_report` — Summary: earned/spent/net + report + standing

**Rule:** If a screen primarily shows stats, tables, or structured data → panel.

### Text Screens (story/narrative)

Use `TerminalLine[]` arrays with braille art, CSS titles, and typewriter effect:
- `splash`, `narrator_intro`, `meet_agents` — Onboarding
- `stellar_choice`, `stellar_connecting` — Wallet connection
- `choose_district`, `choose_mission` — Mission selection
- `set_budget`, `set_posture`, `confirm_dispatch` — Dispatch flow
- `view_shop` — Shop screen with items and prices
- `view_agents`, `view_network`, `view_ledger`, `view_rumors` — Side views
- `event_announcement` — Random events (Slay the Spire-style)
- `game_won`, `game_lost` — End screens

**Rule:** If a screen tells a story or sets a scene → text.

### Transition Guidelines

Transitions between modes should feel intentional:
- Onboarding is ALL text (narrative flow into the game)
- Mission planning starts text (choose_district, choose_mission) then becomes panel (choose_agent) — the shift happens when you need to compare data
- Resolution is panel (dense data), daily report is panel
- Events are text (they're story moments)

## Screen Composition

Each text screen is composed of:
1. **Braille art** at the top (if applicable)
2. **Title** as styled text (CSS font-size + glow)
3. **Content** as plain colored text
4. **Choices** in the bottom input bar (always CSS-styled)

Each panel screen is composed of:
1. **PanelGrid** layout with columns
2. **TerminalPanel** boxes with titles
3. **PanelText** content inside panels
4. **Choices** in the bottom input bar

The braille art provides atmosphere. The CSS panels provide structure. The text provides gameplay.

## Reusable Helpers (`uiHelpers.ts`)

Shared logic used by both text and panel screens. **Always use these instead of inline formatting:**

| Helper | Purpose | Example |
|--------|---------|---------|
| `getHakimGreeting(state)` | Morning greeting (8+ variants) | `"${getHakimGreeting(state)}"` |
| `hakimDailyComment(net)` | End-of-day comment | `"${hakimDailyComment(report.netChange)}"` |
| `getAgentRarity(agent)` | Rarity tier from peak stat | `{ label: "RARE", color: "gold" }` |
| `agentStatLine(agent)` | Haggle/Scout/Charm line | `Haggle: +5  Scout: +2  Charm: -1` |
| `agentMetaLine(agent)` | Risk/Fee/Morale line | `Risk: 25%  Fee: 8¤  Morale: 80%` |
| `agentSummaryLines(agent, i)` | Full compact agent entry | Name + stats + fee + rarity |
| `cash(amount)` | Currency with ¤ suffix | `cash(42)` → `"42¤"` |
| `financialSummaryLines(...)` | Spent/earned/net + rep | Consistent P&L display |
| `sectionHeader(text)` | Title + dashed divider | For text-mode section breaks |
| `treasuryLines(state)` | Treasury/rep/agents block | Morning brief dashboard stats |
| `morningBriefChoices(state)` | Menu choices | Single source for morning brief menu |

## Animation & Typewriter Rules

### Typewriter (progressive line reveal)
Story/narrative screens reveal lines one at a time (60ms/line, skip on keypress):
- `narrator_intro`, `stellar_choice`, `meet_agents`, `resume_or_new`
- `event_announcement`, `game_won`, `game_lost`

**NOT** typewriter (show immediately):
- Loading screens (`stellar_connecting`, `generating_agents`, `resolving`) — spinner must be visible
- Data screens (`choose_district`, `choose_mission`, `set_budget`, etc.) — no delay needed
- Panel screens (`morning_brief`, `choose_agent`, `resolution_narrative`, `daily_report`)

### Animations by screen

| Screen | Type | Animation | Duration |
|--------|------|-----------|----------|
| `splash` | Ambient | Gold shimmer on title | Infinite |
| `narrator_intro` | Entrance | Gold shimmer on Hakim portrait | 3s |
| `stellar_choice` | Entrance | Teal constellation on ledger art | 5s |
| `stellar_connecting` | Loading | Constellation + spinner | Until connected |
| `meet_agents` | Entrance | Rarity-based (rainbow/shimmer/pulse) | 2.5–4s |
| `generating_agents` | Loading | Spinner | Until generated |
| `event_announcement` | Entrance | Stamp flash on event art | 1.5s |
| `resolving` | Loading | Spinner | Until resolved |
| `game_won` | Celebration | Sparkle fireworks + rainbow | 8s |
| `game_lost` | Somber | Red pulse | 5s |

Three categories:
- **Ambient** — infinite loops while on screen
- **Entrance** — brief flair when screen appears
- **Loading** — spinners for async operations

All animations clear on screen change (`animManager.clear()`).

## Game Systems

### Shop (`view_shop`)
- Text screen with braille chest art, accessible via **[S]** from morning brief
- 5 items with progressive unlock (reputation gates at 30, 50)
- Effects: morale_boost (instant), budget_discount (duration), rep_boost (instant), intel (duration), protection (duration)
- Durations tick down daily in `advanceDay()`
- Budget discount applied in `dispatchMission()`

### Agent Quests
- Generated per agent at campaign start via `generateAgentQuests()`
- Displayed in agent roster view (text) and morning brief panel (inline)
- Requirements: missions completed, reputation milestones
- Rewards: stat_boost, cost_reduction — applied via `APPLY_QUEST_REWARD` action
- Progress tracked via `updateQuestProgress()` in `advanceDay()`

### Rival Personality
- 4 rival types: aggressive, cunning, charismatic, ruthless
- Spawns in week 2 with `pickRival()`
- Daily interference via `resolveRivalInterference()` — generates style-specific rumors
- Blocked by Ward Charm shop item
- Displayed in morning brief panel with catchphrase and reputation comparison

### Screen Routing for New Systems

| Screen | Type | Access |
|--------|------|--------|
| `view_shop` | Text (braille art + items) | Morning brief → [S] |
| Agent quests | Appended to `view_agents` | Morning brief → [A] |
| Rival card | Panel in `morning_brief` | Always visible after week 2 |

## Consistency Checklist

Before adding any new visual element:
- [ ] Does it use CSS for borders/frames? (not characters)
- [ ] Is all art rendered as braille? (not box-drawing)
- [ ] Are text lines single-span where possible?
- [ ] Does the color follow the palette?
- [ ] Is the font-size appropriate? (not letter-spacing for titles)
- [ ] Will it look the same in any monospace font?
- [ ] Is currency displayed with `cash()` helper? (always shows ¤ suffix)
- [ ] Are agent stats displayed with `agentStatLine()`/`agentMetaLine()`?
- [ ] Is shared logic from `uiHelpers.ts` used? (not duplicated)
