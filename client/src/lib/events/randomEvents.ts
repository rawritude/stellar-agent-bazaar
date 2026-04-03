// ═══════════════════════════════════════════════════════════════
// RANDOM EVENT SYSTEM — Slay the Spire-style between-day events
//
// Events fire between days with unique scenarios, choices,
// and permanent consequences. Each event has:
// - A trigger condition (day range, reputation range, cash range)
// - ASCII art category (for visual theming)
// - 2-3 choices with different risk/reward profiles
// - Permanent effects on game state
// ═══════════════════════════════════════════════════════════════

export interface RandomEventChoice {
  label: string;
  description: string;
  effects: RandomEventEffect[];
}

export interface RandomEventEffect {
  type: "cash" | "reputation" | "morale_all" | "morale_agent"
    | "counterparty_trust" | "unlock_rumor" | "agent_stat"
    | "upkeep_modifier";
  value: number;
  target?: string;
  description: string;
}

export interface RandomEvent {
  id: string;
  name: string;
  artCategory: "merchant" | "stranger" | "disaster" | "celebration" | "agent" | "mystery";
  narration: string[];  // Hakim's multi-line narration
  choices: RandomEventChoice[];
  // Trigger conditions
  minDay: number;
  maxDay: number;
  minReputation?: number;
  maxReputation?: number;
  minCash?: number;
  maxCash?: number;
  oneTimeOnly: boolean;
}

// ═══════════════════════════════════════════════════════════════
// EVENT POOL
// ═══════════════════════════════════════════════════════════════

export const RANDOM_EVENT_POOL: RandomEvent[] = [
  // ── MERCHANT ENCOUNTERS ─────────────────────────
  {
    id: "traveling-merchant",
    name: "The Traveling Merchant",
    artCategory: "merchant",
    narration: [
      "A weathered trader blocks your path, his cart overflowing with curiosities.",
      "\"I have something you need,\" he says, pulling back a velvet cloth.",
      "\"A map to a hidden supplier. Or... I could use an investor.\"",
    ],
    choices: [
      {
        label: "Buy the map (30¤)",
        description: "A hidden supplier route — future trades in one district may cost less.",
        effects: [
          { type: "cash", value: -30, description: "-30¤" },
          { type: "unlock_rumor", value: 0, target: "A hidden trade route has been discovered. Costs may drop.", description: "New rumor unlocked" },
        ],
      },
      {
        label: "Invest in his venture (50¤)",
        description: "Risky, but could pay off handsomely.",
        effects: [
          { type: "cash", value: -50, description: "-50¤" },
          { type: "cash", value: 90, description: "+90¤ (investment return)" },
          { type: "reputation", value: 3, description: "+3 reputation" },
        ],
      },
      {
        label: "Decline politely",
        description: "Walk away. Sometimes the best deal is no deal.",
        effects: [],
      },
    ],
    minDay: 3, maxDay: 20, oneTimeOnly: true,
  },
  {
    id: "spice-hoarder",
    name: "The Spice Hoarder",
    artCategory: "merchant",
    narration: [
      "A nervous merchant approaches, glancing over his shoulder.",
      "\"I have twelve crates of Void Saffron. Very rare. Very... hot.\"",
      "\"Buy now, sell tomorrow at triple the price. Or report me to the guild.\"",
    ],
    choices: [
      {
        label: "Buy the saffron (40¤)",
        description: "Could be genuine. Could be a scam. High risk, high reward.",
        effects: [
          { type: "cash", value: -40, description: "-40¤" },
          { type: "cash", value: 80, description: "+80¤ (if genuine)" },
        ],
      },
      {
        label: "Report to the guild",
        description: "The guild rewards tipsters. Safely.",
        effects: [
          { type: "reputation", value: 5, description: "+5 reputation" },
          { type: "cash", value: 10, description: "+10¤ reward" },
        ],
      },
      {
        label: "Walk away quietly",
        description: "Not your problem.",
        effects: [],
      },
    ],
    minDay: 5, maxDay: 25, oneTimeOnly: true,
  },

  // ── MYSTERIOUS STRANGERS ────────────────────────
  {
    id: "fortune-teller",
    name: "The Fortune Teller",
    artCategory: "stranger",
    narration: [
      "A hooded figure sits behind a table of shimmering crystals.",
      "\"I see two paths before you,\" she whispers.",
      "\"One leads to gold. The other to wisdom. Choose.\"",
    ],
    choices: [
      {
        label: "The path of gold",
        description: "She gives you a tip that could boost your next trade.",
        effects: [
          { type: "cash", value: 25, description: "+25¤" },
          { type: "reputation", value: -2, description: "-2 reputation (seen at fortune teller)" },
        ],
      },
      {
        label: "The path of wisdom",
        description: "She reveals which counterparties are trustworthy.",
        effects: [
          { type: "reputation", value: 5, description: "+5 reputation" },
          { type: "counterparty_trust", value: 15, target: "whisper-network", description: "Whisper Network trust +15" },
        ],
      },
    ],
    minDay: 2, maxDay: 28, oneTimeOnly: false,
  },
  {
    id: "mysterious-patron",
    name: "A Mysterious Patron",
    artCategory: "stranger",
    narration: [
      "A richly dressed figure slides into the booth beside you.",
      "\"I've been watching your operation. Impressive... for a novice.\"",
      "\"I'd like to make you an offer. My backing, for a share of your brand.\"",
    ],
    choices: [
      {
        label: "Accept the patronage",
        description: "Immediate cash injection, but your upkeep increases permanently.",
        effects: [
          { type: "cash", value: 60, description: "+60¤" },
          { type: "upkeep_modifier", value: 3, description: "Daily upkeep +3¤ permanently" },
        ],
      },
      {
        label: "Decline with respect",
        description: "Maintain independence. The patron is impressed by your spine.",
        effects: [
          { type: "reputation", value: 4, description: "+4 reputation" },
        ],
      },
    ],
    minDay: 8, maxDay: 22, minReputation: 30, oneTimeOnly: true,
  },

  // ── AGENT PERSONAL EVENTS ──────────────────────
  {
    id: "agent-morale-crisis",
    name: "Agent Morale Crisis",
    artCategory: "agent",
    narration: [
      "One of your agents is seen sitting alone at a tea stall, looking defeated.",
      "\"The work is too much,\" they say. \"The counterparties are exhausting.\"",
      "\"I need either a raise or a holiday. Your choice, boss.\"",
    ],
    choices: [
      {
        label: "Give them a raise (15¤)",
        description: "Morale restored. They'll work harder.",
        effects: [
          { type: "cash", value: -15, description: "-15¤" },
          { type: "morale_all", value: 15, description: "All agents +15 morale" },
        ],
      },
      {
        label: "Give them a day off",
        description: "No cost, but they'll miss tomorrow's missions.",
        effects: [
          { type: "morale_all", value: 8, description: "All agents +8 morale" },
        ],
      },
      {
        label: "Give a motivational speech",
        description: "Free, but might backfire.",
        effects: [
          { type: "morale_all", value: -5, description: "All agents -5 morale (they wanted action, not words)" },
          { type: "reputation", value: 2, description: "+2 reputation (good optics)" },
        ],
      },
    ],
    minDay: 5, maxDay: 30, oneTimeOnly: false,
  },
  {
    id: "agent-discovers-talent",
    name: "Hidden Talent Discovered",
    artCategory: "agent",
    narration: [
      "During a routine mission debrief, one of your agents reveals a surprising skill.",
      "\"I used to work as a... well, it doesn't matter. Point is, I'm better than you think.\"",
      "\"Let me prove it. Give me a harder assignment.\"",
    ],
    choices: [
      {
        label: "Let them prove themselves",
        description: "One agent gets a stat boost but takes on more risk.",
        effects: [
          { type: "agent_stat", value: 5, description: "Random agent: +5 to specialty stat" },
        ],
      },
      {
        label: "Keep the current assignments",
        description: "Stability over ambition.",
        effects: [
          { type: "morale_all", value: -3, description: "Agent disappointed: -3 morale" },
        ],
      },
    ],
    minDay: 7, maxDay: 25, oneTimeOnly: true,
  },

  // ── MARKET DISRUPTIONS ─────────────────────────
  {
    id: "supply-shortage",
    name: "Supply Chain Disruption",
    artCategory: "disaster",
    narration: [
      "The morning delivery carts are conspicuously absent.",
      "\"The southern route is blocked,\" Hakim reports.",
      "\"Prices will spike. But for those with stock... opportunity.\"",
    ],
    choices: [
      {
        label: "Buy up remaining stock (35¤)",
        description: "Expensive now, but could sell high tomorrow.",
        effects: [
          { type: "cash", value: -35, description: "-35¤" },
          { type: "cash", value: 55, description: "+55¤ (selling at inflated prices)" },
          { type: "reputation", value: -2, description: "-2 reputation (price gouging)" },
        ],
      },
      {
        label: "Help the supply chain",
        description: "Use your logistics contacts to help fix the route.",
        effects: [
          { type: "reputation", value: 8, description: "+8 reputation (community hero)" },
          { type: "counterparty_trust", value: 10, target: "cart-and-mule", description: "Cart & Mule trust +10" },
        ],
      },
    ],
    minDay: 6, maxDay: 24, oneTimeOnly: true,
  },
  {
    id: "tax-collector",
    name: "The Tax Collector Cometh",
    artCategory: "disaster",
    narration: [
      "A stern figure in official robes appears at your stall.",
      "\"Your bazaar tax is due. Immediately.\"",
      "\"Pay in full, or... we can discuss 'alternative arrangements.'\"",
    ],
    choices: [
      {
        label: "Pay the full tax (25¤)",
        description: "Legitimate. Clean. Boring.",
        effects: [
          { type: "cash", value: -25, description: "-25¤" },
          { type: "reputation", value: 3, description: "+3 reputation (upstanding citizen)" },
        ],
      },
      {
        label: "Negotiate a discount",
        description: "Try to haggle with the taxman. Bold move.",
        effects: [
          { type: "cash", value: -12, description: "-12¤ (half price)" },
          { type: "reputation", value: -3, description: "-3 reputation (tax dodger rumors)" },
        ],
      },
      {
        label: "Claim diplomatic immunity",
        description: "You don't have diplomatic immunity. But confidence is free.",
        effects: [
          { type: "reputation", value: -5, description: "-5 reputation (audacity)" },
          { type: "morale_all", value: 10, description: "All agents +10 morale (they think you're hilarious)" },
        ],
      },
    ],
    minDay: 4, maxDay: 26, oneTimeOnly: false,
  },

  // ── CELEBRATIONS ───────────────────────────────
  {
    id: "street-festival",
    name: "Spontaneous Street Festival",
    artCategory: "celebration",
    narration: [
      "Music erupts from the plaza. Dancers, jugglers, and a suspicious amount of confetti.",
      "\"A festival! Unplanned, unauthorized, and absolutely magnificent.\"",
      "\"This could be good for business... if you play it right.\"",
    ],
    choices: [
      {
        label: "Set up a pop-up stall (20¤)",
        description: "High foot traffic. Good brand visibility.",
        effects: [
          { type: "cash", value: -20, description: "-20¤" },
          { type: "cash", value: 35, description: "+35¤ (sales)" },
          { type: "reputation", value: 5, description: "+5 reputation" },
        ],
      },
      {
        label: "Join the festivities",
        description: "No business, but great for team morale.",
        effects: [
          { type: "morale_all", value: 20, description: "All agents +20 morale (party!)" },
        ],
      },
      {
        label: "Stay in and do paperwork",
        description: "Someone has to be the responsible one.",
        effects: [
          { type: "cash", value: 5, description: "+5¤ (found discrepancy in the books)" },
        ],
      },
    ],
    minDay: 3, maxDay: 27, oneTimeOnly: false,
  },

  // ── MYSTERIES ──────────────────────────────────
  {
    id: "locked-chest",
    name: "The Locked Chest",
    artCategory: "mystery",
    narration: [
      "While cleaning the back room, an agent finds a locked chest behind a loose brick.",
      "\"It has the bazaar's old crest on it,\" Hakim observes.",
      "\"Could be treasure. Could be trouble. Could be both.\"",
    ],
    choices: [
      {
        label: "Force it open",
        description: "Might damage what's inside. Might find gold.",
        effects: [
          { type: "cash", value: 45, description: "+45¤ (ancient coins!)" },
        ],
      },
      {
        label: "Find the key (costs a day)",
        description: "Safer, but takes time. Your scout could track it down.",
        effects: [
          { type: "cash", value: 70, description: "+70¤ (full contents preserved)" },
          { type: "reputation", value: 3, description: "+3 reputation (respectful of bazaar heritage)" },
        ],
      },
      {
        label: "Turn it in to the guild",
        description: "The honest choice. The guild rewards integrity.",
        effects: [
          { type: "reputation", value: 10, description: "+10 reputation" },
          { type: "counterparty_trust", value: 20, target: "guild-of-ledgers", description: "Guild trust +20" },
        ],
      },
    ],
    minDay: 8, maxDay: 30, oneTimeOnly: true,
  },
  {
    id: "anonymous-letter",
    name: "An Anonymous Letter",
    artCategory: "mystery",
    narration: [
      "A note slides under your door at dawn. No signature.",
      "\"Your competitor is cheating. I have proof. Meet me at the fountain.\"",
      "\"Come alone.\"",
    ],
    choices: [
      {
        label: "Go to the meeting",
        description: "Could be a trap. Could be valuable intel.",
        effects: [
          { type: "reputation", value: 5, description: "+5 reputation (exposed a cheat)" },
          { type: "unlock_rumor", value: 0, target: "A competitor has been caught cheating. Their reputation is damaged.", description: "Explosive rumor unlocked" },
        ],
      },
      {
        label: "Send an agent instead",
        description: "Safer. Your agent takes the risk.",
        effects: [
          { type: "morale_all", value: -5, description: "Agent: -5 morale (felt expendable)" },
          { type: "reputation", value: 3, description: "+3 reputation" },
        ],
      },
      {
        label: "Burn the letter",
        description: "You don't play cloak-and-dagger games.",
        effects: [],
      },
    ],
    minDay: 10, maxDay: 28, minReputation: 25, oneTimeOnly: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// EVENT SELECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Pick a random event appropriate for the current game state.
 * Returns null if no event triggers (roughly 40% chance per day).
 */
export function pickRandomEvent(
  day: number,
  cash: number,
  reputation: number,
  triggeredEventIds: string[],
): RandomEvent | null {
  // 40% chance of an event on any given day
  if (Math.random() > 0.4) return null;

  // Filter eligible events
  const eligible = RANDOM_EVENT_POOL.filter(e => {
    if (day < e.minDay || day > e.maxDay) return false;
    if (e.minReputation !== undefined && reputation < e.minReputation) return false;
    if (e.maxReputation !== undefined && reputation > e.maxReputation) return false;
    if (e.minCash !== undefined && cash < e.minCash) return false;
    if (e.maxCash !== undefined && cash > e.maxCash) return false;
    if (e.oneTimeOnly && triggeredEventIds.includes(e.id)) return false;
    // Don't offer events the player can't afford
    const minCost = Math.min(...e.choices.map(c =>
      c.effects.filter(ef => ef.type === "cash" && ef.value < 0).reduce((s, ef) => s + ef.value, 0)
    ));
    if (cash + minCost < 0) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // Pick one randomly
  return eligible[Math.floor(Math.random() * eligible.length)];
}
