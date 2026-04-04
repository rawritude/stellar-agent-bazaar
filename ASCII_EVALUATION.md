# ASCII Art & Animation Evaluation — The Velvet Ledger

## 1. Where ASCII Art IS Used

### Splash Screen (`SPLASH_ART` in terminalText.ts)
A multi-line bazaar building with pointed roofs, arched windows, and ornamental pillars. Rendered in gold/amber, paired with the game title "THE VELVET LEDGER BAZAAR" and tagline. This is the single most polished piece of art in the game. It gets a shimmer animation on the TerminalShell (infinite duration, gold palette). Works well.

### Hakim Portrait (`HAKIM_PORTRAIT`)
A small 8-line face made of slashes, pipes, and underscores. Appears during the narrator intro. Functional but basic — it reads as "a face" and nothing more. No animation attached.

### Agent Portraits (`AGENT_ART` — 5 entries)
Tiny 5-line ASCII portraits for each of the five default agents: Pepper Jack (chili pepper shape), Auntie Null (rounded face), Ledger Pup (cat/dog ears), Marquis of Samples (top hat), Crow Unit Sigma (bird silhouette). These only appear for the hardcoded agents. AI-generated agents get no art at all — just an emoji + name in text. This is a significant gap since AI-generated agents are a core feature.

### District Art (`DISTRICT_ART` — 3 entries)
Small 5-line vignettes for each district: Velvet Steps (columned building), Fungal Quarter (mushroom shape), Festival Sprawl (tent/stall shape). These appear during district selection. Serviceable but not memorable.

### Success Art (`SUCCESS_ART`)
A 5-line star burst pattern with "SUCCESS" in the center. Green. Used after mission resolution succeeds.

### Failure Art (`FAILURE_ART`)
A 5-line frowning face with "FAILED" below. Red. Used after mission resolution fails.

### Resolving Art (`RESOLVING_ART`)
A 4-line arrow-in-a-circle with the text "Your agents venture into the bazaar..." Appears during the resolving screen.

### Stellar Art (`STELLAR_ART`)
An 11-line star field with a central device shape and "STELLAR NETWORK" text. Teal colored. Used during wallet onboarding flow. Gets a constellation animation in TerminalShell. One of the more atmospheric pieces.

### Dividers (3 variants)
- `DIVIDER`: Tildes (~). Generic separator.
- `ORNAMENTAL_DIVIDER`: Diamond pattern (<> <>). Used for day headers and report headers.
- `THIN_DIVIDER`: Dashes (--). Used everywhere as a section break.

These are functional but repetitive. The ornamental divider carries some bazaar flavor; the other two are utilitarian.

---

## 2. Where ASCII Art SHOULD Be Used But Isn't

### Mission Resolution — Success vs. Failure Feel Identical
The `SUCCESS_ART` and `FAILURE_ART` are tiny and interchangeable in emotional weight. A spectacular success should feel triumphant — the current 5-line star blob does not convey "your agent just pulled off an impossible deal." A catastrophic failure should feel like a gut punch — the current sad face is more "meh" than "disaster."

Beyond the art itself, both outcomes use the same screen layout, same text formatting, same pacing. There is no differentiation in atmosphere between "net +45 gold legendary trade" and "your agent was thrown out of the guild hall."

### Day Transitions — Morning/Evening Atmosphere
The morning brief has a text header (`DAY X — Morning Brief`) and an ornamental divider, but no atmospheric art. A dawn scene (rising sun, rooftop silhouettes, the bazaar waking up) would set the tone. The day report similarly uses the same ornamental divider. An evening/sunset scene would create a sense of time passing.

The `MorningBriefLayout` in PanelLayouts.tsx is entirely panel-based with no art at all — just structured data in boxes. This is the screen the player sees most often, and it is the most visually bland screen in the game.

### Events — Market Crash, Rival Arrival, Festival
Events fire silently. The `activeEvents` array is populated and effects are applied, but there is zero visual fanfare when a market crash begins, when a rival brand arrives, or when a festival launches. These are the most dramatic moments in the campaign and they produce no art, no animation, no special screen. They are mentioned in a rumor line at most.

### Agent Morale Milestones
Agents can hit morale 10% (burned out) or morale 100% (ecstatic). Neither triggers any visual indicator beyond a color change on a number. A morale collapse should feel like something — a slumped figure, a "resignation letter" moment. A morale peak could show the agent celebrating.

### Counterparty Trust Thresholds
When a counterparty's trust drops to "refuses service," there is no moment. The game just stops offering them as an option. When trust is high enough for premium pricing, same thing — invisible. Trust milestones (first positive interaction, "trusted partner" threshold, "blacklisted" threshold) deserve visual beats.

### Campaign Week Transitions
The campaign tracks weeks (state.campaign.week) but there is no week-transition screen. Weeks could have a "weekly report" with a different visual style — a larger summary, a leaderboard against the rival, a Hakim speech about the changing market.

### Win/Lose Screens
The campaign has `isGameOver`, `hasWon`, and `gameOverReason` fields. There is no win screen. There is no lose screen. The most important moment in a 30-day campaign — the ending — has no dedicated art or animation whatsoever. This is the single biggest gap.

### The Daily Report
`buildDailyReport` in terminalText.ts and `DailyReportLayout` in PanelLayouts.tsx both present financial numbers and Hakim's comment. There is no art. The panel layout version is three colored boxes (Earned/Spent/Net) stacked above a text panel. It is purely informational with no emotional weight. A good day should feel rewarding. A bad day should feel ominous.

### AI-Generated Agent Introductions
When AI generates agents, they get a generic text block in `hakimAgentIntro()` — emoji, name, title, stats. The five default agents each have custom ASCII portraits. AI-generated agents deserve at least procedurally-selected portrait templates based on their specialty or emoji.

---

## 3. Animation Gaps

### The Animation System Supports 12 Types
The `animations.ts` file defines: rainbow, shimmer, typewriter, spinner, particles, reveal, pulse, sparkle, scroll_border, stamp, constellation, fireworks. There are factory functions for all 12 plus a `goldCascade` particles variant.

### What Is Actually Wired In (TerminalShell.tsx)
Only 5 of 12 animation types are triggered by screen transitions:

1. **shimmer** — splash screen title (infinite, gold palette)
2. **spinner** — resolving screen and agent generation screen
3. **constellation** — Stellar connecting screen
4. **rainbow** — legendary agent reveal (stat >= 28)
5. **sparkle** — legendary agent reveal (alongside rainbow)
6. **pulse** — uncommon agent reveal (stat >= 15)
7. **shimmer** (again) — rare agent reveal (stat >= 22)

### Unused Animation Types
- **typewriter** — Built, has a factory function, never triggered. This should be used for Hakim's dialogue, AI-generated scene dialogue, dramatic reveals, and the daily report commentary.
- **particles / goldCascade** — Built, never triggered. Should fire on profitable mission completion (gold coins falling), big financial milestones.
- **reveal** — Built, never triggered. Should be used for the daily report (lines appear one at a time), mission narrative steps, and event announcements.
- **fireworks** — Built, complete with burst physics and fire colors. Never triggered. Should fire on: winning the championship, legendary mission outcome, major reputation milestone, week 4 climax.
- **stamp** — Built (flash bright then settle). Never triggered. Should be used for: mission dispatch confirmation, receipt creation, NFT minting.
- **scroll_border** — Built (infinite scrolling pattern). Never triggered. Could be used on the morning brief header or active event banners.

### Where Typewriter Would Enhance Narrative
- Hakim's intro monologue — currently appears as static text. Typewriter would make it feel like he's speaking.
- AI-generated dialogue — each line could typewrite in, creating a sense of real-time conversation.
- Event announcements — "A MARKET CRASH HAS BEGUN" typing out letter by letter would be dramatically effective.
- Win/lose screen text (once it exists).

### Where Particles/Fireworks Should Trigger
- **Fireworks**: Championship win, legendary agent stat reveal (currently only gets rainbow), hitting reputation 70+.
- **Gold cascade**: Mission profit > 30, daily net positive > 50, hitting cash milestones (100, 200, 500).
- **Particles**: Market crash event (falling debris characters), festival event (confetti).

---

## 4. Repetitiveness — What Feels Same-Old

### The Morning Brief
Every day starts with the same panel layout: Hakim Says box, Treasury box, Agents box, Rumor box. There are only 4 greeting variations for the "normal" state (cycled by day modulo). By day 8, the player has seen all of them twice. The layout never changes. The colors never change. There is no visual indicator of what day of the campaign you are on (early game vs. late game vs. endgame).

### Mission Dispatch Flow
The dispatch flow is: choose district -> choose mission -> choose agent -> choose budget -> choose posture -> confirm. Every single step is the same indented text list with `[1]` `[2]` choices. There is no art at any step. Five screens that all look identical except for the data inside them.

### Resolution Narrative
Every mission resolution uses `buildMissionNarrative` which follows the exact same template: thin divider, agent name, district, thin divider, success/failure art (always the same 5 lines), headline, interaction trail, financial summary, details. Whether you completed a trade mission or a sabotage op, whether you made 50 gold or lost everything, the visual structure is identical.

### District Selection
All three districts show their small art piece and then identical stat formatting. There is no sense that the Fungal Quarter is different from the Velvet Steps beyond the 5-line icon and the color.

### The Panel Layout Screens (PanelLayouts.tsx)
`MorningBriefLayout`, `AgentSelectLayout`, `ResolutionLayout`, `DailyReportLayout` — all four use the same `TerminalPanel` component with the same border styling, same color scheme, same spacing. They are visually indistinguishable at a glance. The game feels like a spreadsheet with borders.

---

## 5. Specific ASCII Art Suggestions

### Market Crash Event
A crumbling market stall: tilted columns, scattered coins on the ground, a broken scale. The art should suggest disorder — diagonal lines, broken symmetry. Maybe 8-10 lines tall. Render in red/orange. Should trigger a stamp animation (flash bright, then settle to red) followed by a pulse animation (red/orange alternating). Include a Hakim quote: something about "the market is a living thing, and today it is unwell."

### Rival Arrives Moment
A silhouette of a figure standing in an archway with a banner behind them. The rival should feel imposing — broad shoulders, a cape or coat, maybe a rival trading company emblem. Render in purple/orange to signal threat. Should trigger a reveal animation (the silhouette appears line by line) followed by a pulse between purple and dim. This is a campaign-defining moment and currently has zero visual presence.

### Winning the Championship
The largest art piece in the game — 12-15 lines. A trophy or crown atop a pile of coins, with stars radiating outward. Perhaps the bazaar building from the splash art but decorated with banners and fireworks characters. Render in gold/rainbow. Should trigger fireworks animation first, then rainbow on the trophy, then shimmer on the text. The splash screen shimmer should feel like a callback. Hakim's final speech should use typewriter animation.

### Losing / Bankruptcy
A closed/shuttered market stall. Boards nailed across the door. A "CLOSED" sign. Render in red fading to dim. Should trigger a reverse-reveal (lines disappear one at a time from bottom to top) or a slow fade via the pulse animation (between the red color and black/dim). Hakim's farewell should typewriter slowly.

### Day Transition — Dawn
A horizon line with a rising half-circle (sun), rooftop silhouettes below, and a few stars above that are fading. 6-8 lines. Render in amber/gold for the sun, dim for the buildings. Would replace the flat "DAY X — Morning Brief" header and give each morning a sense of a new beginning.

### Day Transition — Evening
The same horizon but with the half-circle setting, deeper colors (orange to dim), and a crescent moon rising. Could show lamp-light from the bazaar stalls below. Used at the daily report screen.

### Agent Morale Collapse (below 20%)
A small slumped figure — head down, arms hanging. 4-5 lines. Render in red/dim. Should appear inline in the daily report when an agent's morale crosses the 20% threshold.

### Agent Morale Peak (100%)
A small celebratory figure — arms raised, sparkle characters around them. 4-5 lines. Render in green/gold. Should appear inline and trigger a sparkle animation.

### Counterparty Refuses Service
A door slamming shut — a rectangle (door frame) with a diagonal line across it (slammed door). 4-5 lines. Render in red. Brief stamp animation. This is a relationship-ending moment and the player should feel it.

### Counterparty Trusted Partner
A handshake symbol — two stylized hands meeting. 4-5 lines. Render in green/teal. Brief shimmer animation. A positive milestone worth celebrating.

### Weekly Campaign Summary
A ledger/book shape, open, with stylized numbers inside. 6-8 lines. Render in amber. Should appear at the transition between campaign weeks (day 7, 14, 21) as a "chapter break." Could use the scroll_border animation on the edges to suggest turning pages.

### AI-Generated Scene Dialogue Header
Not a static art piece, but a procedural element: when AI dialogue is displayed, the interaction should be framed by a small "stage curtain" or "conversation bubble" border made of box-drawing characters. This would visually separate AI-generated narrative from mechanical game output and make the scenes feel like vignettes.

### Generic Agent Portraits (for AI-generated agents)
5 template portraits mapped to specialties: trade (scales/abacus shape), scout (eye/telescope shape), investigation (magnifying glass shape), branding (megaphone/banner shape), diplomacy (handshake/scroll shape). When AI generates an agent with specialty "scout," they would get the scout template portrait. This would close the gap between default agents (who have custom art) and AI agents (who have none).

---

## Summary Assessment

The game has a solid animation engine (12 types, clean architecture, performant RAF loop) that is 60% unused. It has ASCII art for the opening and character introductions but nothing for the moments that matter most: winning, losing, events firing, relationships changing, the campaign's dramatic arc.

The biggest problem is not missing art — it is missing emotional differentiation. A legendary win looks the same as a mundane success. A market crash arrives without fanfare. The campaign ends without ceremony. The animation system was clearly built to support a richer experience than what is currently wired in.

Priority fixes:
1. Win/lose screens with dedicated art and fireworks/fade animations
2. Event trigger art (market crash, rival arrival, festival) with stamp/reveal animations
3. Day transition art (dawn/evening) to create rhythm
4. Wire up typewriter for all Hakim dialogue and AI-generated scenes
5. Wire up fireworks/goldCascade for financial milestones
6. Generic agent portraits by specialty for AI-generated agents
7. Morning brief variety (layout, greeting pool, visual indicators of campaign phase)
