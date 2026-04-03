# Design Guidelines — The Velvet Ledger Bazaar

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
- Example: `<span style="fontSize: '1.4em', textShadow: '0 0 10px #d4a843'">The Velvet Ledger Bazaar</span>`

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

## Screen Composition

Each screen is composed of:
1. **CSS Panel** container (border, glow, padding)
2. **Braille art** at the top (if applicable)
3. **Title** as styled text (CSS font-size + glow)
4. **Content** as plain colored text
5. **Choices** in the bottom input bar (always CSS-styled)

The braille art provides atmosphere. The CSS panels provide structure. The text provides gameplay.

## Consistency Checklist

Before adding any new visual element:
- [ ] Does it use CSS for borders/frames? (not characters)
- [ ] Is all art rendered as braille? (not box-drawing)
- [ ] Are text lines single-span where possible?
- [ ] Does the color follow the palette?
- [ ] Is the font-size appropriate? (not letter-spacing for titles)
- [ ] Will it look the same in any monospace font?
