import { line, span, blank, indented, title, divider, figletBlock, type TerminalLine, type TerminalChoice } from "./terminalTypes";
import type { GameState, Agent, District, MissionTemplate, ActiveMission, Counterparty, ActionStep } from "../gameData";
import { ACTION_TYPE_INFO } from "../gameData";
import { getReputationTier, getCashTier } from "../gameEngine";
import {
  renderBazaarEntrance, renderDjinn, renderTrophy, renderLedger,
  renderChest, renderMarketplace, renderCaravan, renderSpyScene,
  renderFestival, renderCrash, renderHandshake,
} from "./brailleArt";

// ===============================================================
// ASCII ART
// ===============================================================

export const SPLASH_ART: TerminalLine[] = [
  blank(),
  ...renderBazaarEntrance(),
  blank(),
  title("The Bazaar", "gold", "2.4em", true),
  title("The Velvet Ledger", "amber", "1em", false),
  blank(),
  title("Spice lanes · Shady deals · Cosmic ledgers", "dim", "0.85em", false),
  blank(),
];

export const DIVIDER: TerminalLine[] = [
  divider("dim"),
];

export const ORNAMENTAL_DIVIDER: TerminalLine[] = [
  divider("gold"),
];

export const THIN_DIVIDER: TerminalLine[] = [
  divider("dim", "dashed"),
];

const HAKIM_PORTRAIT: TerminalLine[] = [
  ...renderDjinn(),
  blank(),
  title("Hakim", "gold", "1.6em", true),
  title("the Ledger-Keeper", "amber", "1em", false),
  blank(),
  line(span("     Keeper of Receipts. Counter of Coins.", "dim")),
  line(span("     Witness to Every Deal in the Bazaar.", "dim")),
];

const AGENT_ART: Record<string, TerminalLine[]> = {
  "pepper-jack": [
    line(span("    🌶️  ", "orange"), span("Pepper Jack", "cyan", true)),
    line(span("        ", "dim"), span("Senior Haggler", "dim")),
  ],
  "auntie-null": [
    line(span("    🔮  ", "purple"), span("Auntie Null", "cyan", true)),
    line(span("        ", "dim"), span("Vibe Auditor", "dim")),
  ],
  "ledger-pup": [
    line(span("    🐕  ", "green"), span("Ledger Pup 4", "cyan", true)),
    line(span("        ", "dim"), span("Reconciliation Unit", "dim")),
  ],
  "marquis-samples": [
    line(span("    🎩  ", "amber"), span("The Marquis of Samples", "cyan", true)),
    line(span("        ", "dim"), span("Brand Ambassador", "dim")),
  ],
  "crow-sigma": [
    line(span("    🐦‍⬛  ", "white"), span("Crow Unit Sigma", "cyan", true)),
    line(span("        ", "dim"), span("Intelligence Operative", "dim")),
  ],
};

const DISTRICT_ART: Record<string, TerminalLine[]> = {
  "velvet-steps": [
    line(span("    🏛️  ", "gold"), span("The Velvet Steps", "gold", true)),
    line(span("        Marble colonnades. Silk awnings.", "dim")),
    line(span("        Merchants who judge your embossing.", "dim")),
  ],
  "fungal-quarter": [
    line(span("    🍄  ", "green"), span("The Fungal Quarter", "green", true)),
    line(span("        Damp. Aromatic. Deeply suspicious.", "dim")),
    line(span("        Rare spices. Dubious permits.", "dim")),
  ],
  "festival-sprawl": [
    line(span("    🎪  ", "orange"), span("Festival Sprawl", "orange", true)),
    line(span("        Permanent carnival chaos.", "dim")),
    line(span("        Pop-up stalls. Brand battles.", "dim")),
  ],
};

const SUCCESS_ART: TerminalLine[] = [
  line(
    span("        ✦ · ✧ · ✦ · ✧ · ✦", "green"),
  ),
  line(
    span("      ▄▀", "green"),
    span("▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀", "green"),
    span("▀▄", "green"),
  ),
  line(
    span("      █", "green"),
    span("  ★  S U C C E S S  ★  ", "green", true),
    span("█", "green"),
  ),
  line(
    span("      ▀▄", "green"),
    span("▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄", "green"),
    span("▄▀", "green"),
  ),
  line(
    span("        ✦ · ✧ · ✦ · ✧ · ✦", "green"),
  ),
];

const FAILURE_ART: TerminalLine[] = [
  line(
    span("        ░ · ░ · ░ · ░ · ░", "red"),
  ),
  line(
    span("      ▄▀", "red"),
    span("▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀", "red"),
    span("▀▄", "red"),
  ),
  line(
    span("      █", "red"),
    span("  ✗  F A I L E D  ✗    ", "red", true),
    span("█", "red"),
  ),
  line(
    span("      ▀▄", "red"),
    span("▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄", "red"),
    span("▄▀", "red"),
  ),
  line(
    span("        ░ · ░ · ░ · ░ · ░", "dim"),
  ),
];

const RESOLVING_ART: TerminalLine[] = [
  blank(),
  line(span("      ✦    ·    ✧    ·    ✦    ·    ✧", "dim")),
  blank(),
  line(span("", "amber")),
  line(span("    |                                 |", "amber")),
  line(span("    |   ◆ ---- ◇ ---- ◆ ---- ◇ ---- ◆|", "gold")),
  line(span("    |   |      |      |      |      ||", "dim")),
  line(span("    |   ▼      ▼      ▼      ▼      ▼|", "amber")),
  line(span("    |                                 |", "amber")),
  line(span("    |   Agents are in the field...    |", "gold")),
  line(span("    |   Negotiating. Trading. Scheming|", "dim")),
  line(span("    |                                 |", "amber")),
  line(span("    |   ◇ ---- ◆ ---- ◇ ---- ◆ ---- ◇|", "gold")),
  line(span("    |                                 |", "amber")),
  line(span("", "amber")),
  blank(),
  line(span("         Settling transactions...", "teal")),
  blank(),
];

// -- SETUP / ONBOARDING ART ----------------------------------

const WALLET_ART: TerminalLine[] = [
  blank(),
  ...renderLedger(),
  blank(),
  line(span("", "teal")),
  title("The Cosmic Ledger", "teal", "1.4em", true),
  line(span("", "teal")),
  blank(),
  line(span("       Where every transaction is written", "dim")),
  line(span("             among the stars.", "dim")),
  blank(),
];

const BRAND_NAMING_ART: TerminalLine[] = [
  blank(),
  line(span("         ✦    ·    ✧    ·    ✦", "dim")),
  blank(),
  line(span("", "gold")),
  line(span("         ╱|  ◇ --- ◆ --- ◇    |╲", "gold")),
  line(span("        ╱ |                     | ╲", "gold")),
  line(span("", "gold")),
  line(span("       |  |  |               |  |  |", "amber")),
  line(span("       |  |  |  ▸ __________ |  |  |", "amber")),
  line(span("       |  |  |               |  |  |", "amber")),
  line(span("       |  |  |  Your mark     |  |  |", "dim")),
  line(span("       |  |  |  goes here.    |  |  |", "dim")),
  line(span("       |  |  |               |  |  |", "amber")),
  line(span("", "gold")),
  line(span("        ╲ |                     | ╱", "gold")),
  line(span("         ╲|  ◆ --- ◇ --- ◆    |╱", "gold")),
  line(span("", "gold")),
  blank(),
  line(span("        The Ledger Awaits Your Mark", "amber")),
  blank(),
];

const CREW_ASSEMBLING_ART: TerminalLine[] = [
  blank(),
  line(span("        ✦    ·    ✧    ·    ✦    ·    ✧", "dim")),
  blank(),
  line(span("              The bazaar stirs...", "amber")),
  line(span("           Agents are being summoned.", "dim")),
  blank(),
  line(span("", "amber")),
  line(span("        | ·   · | | ·   · | | ·   · |", "amber")),
  line(span("        |  +-+  | |  +-+  | |  +-+  |", "amber")),
  line(span("        |  |?|  | |  |?|  | |  |?|  |", "gold")),
  line(span("        |  +-+  | |  +-+  | |  +-+  |", "amber")),
  line(span("        | ·   · | | ·   · | | ·   · |", "amber")),
  blank(),
  line(span("            |         |         |", "dim")),
  line(span("            ░         ░         ░", "dim")),
  blank(),
  line(span("        Your crew is assembling...", "gold")),
  blank(),
];

// -- WIN / LOSE / EVENT ART ----------------------------------

export const CHAMPIONSHIP_WIN_ART: TerminalLine[] = [
  blank(),
  line(span("   ✦  ·  ✧  ·  ✦  ·  ✧  ·  ✦  ·  ✧  ·  ✦", "gold")),
  line(span("   ·  ✦  ·  ✧  ·  ✦  ·  ✧  ·  ✦  ·  ✧  ·", "gold")),
  blank(),
  line(span("", "gold")),
  line(span("   |                                       |", "gold")),
  line(span("", "gold")),
  line(span("   |            | ★  ★  ★  |              |", "gold")),
  line(span("   |            |           |              |", "gold")),
  line(span("   |            | CHAMPION  |              |", "gold", true)),
  line(span("   |            |           |              |", "gold")),
  line(span("   |            | ★  ★  ★  |              |", "gold")),
  line(span("   |            +=====╤=====+              |", "gold")),
  line(span("   |                 |||                   |", "amber")),
  line(span("   |                 |||                   |", "amber")),
  line(span("   |           +=====╧=====+               |", "amber")),
  line(span("   |           | ◆ ◇ ◆ ◇ ◆|               |", "amber")),
  line(span("   |           | ◇ ◆ ◇ ◆ ◇|               |", "amber")),
  line(span("", "amber")),
  line(span("   |                                       |", "gold")),
  line(span("", "gold")),
  blank(),
  line(span("   ✦  ·  ✧  ·  ✦  ·  ✧  ·  ✦  ·  ✧  ·  ✦", "gold")),
  blank(),
  title("Grand Bazaar Champion", "gold", "1.8em", true),
  blank(),
];

export const BANKRUPTCY_ART: TerminalLine[] = [
  blank(),
  line(span("    ░  ·  ░  ·  ░  ·  ░  ·  ░  ·  ░", "dim")),
  blank(),
  line(span("", "red")),
  line(span("    |                                   |", "red")),
  line(span("", "dim")),
  line(span("    |     |  ╲ ╱  ╲ ╱  ╲ ╱  ╲ ╱|       |", "dim")),
  line(span("    |     |                     |       |", "dim")),
  line(span("    |     |    ✗  C L O S E D   |       |", "red", true)),
  line(span("    |     |                     |       |", "dim")),
  line(span("    |     |   B O A R D E D     |       |", "dim")),
  line(span("    |     |      U P            |       |", "dim")),
  line(span("    |     |                     |       |", "dim")),
  line(span("", "dim")),
  line(span("    |                                   |", "red")),
  line(span("", "red")),
  blank(),
  title("Bankrupt", "red", "1.6em", true),
  blank(),
];

export const MARKET_CRASH_ART: TerminalLine[] = [
  blank(),
  line(span("", "red")),
  line(span("        |   ░░░ CRASH ░░░       |", "red", true)),
  line(span("        |  --- ◇ --- ◇ ---     |", "orange")),
  line(span("        |    ▒▒▒  ▓▓▓  ▒▒▒     |", "dim")),
  line(span("        |      ░░░░░░░░░        |", "dim")),
  line(span("", "red")),
  blank(),
];

export const RIVAL_ARRIVES_ART: TerminalLine[] = [
  blank(),
  line(span("", "purple")),
  line(span("", "purple")),
  line(span("        |       | ◆ ◆ |         |", "purple")),
  line(span("        |       |  ▽  |         |", "purple")),
  line(span("", "purple")),
  line(span("        |    |           |      |", "purple")),
  line(span("", "purple")),
  line(span("", "purple")),
  line(span("      THE CRIMSON LEDGER", "purple", true)),
  line(span("           has arrived.", "dim")),
  blank(),
];

export const FESTIVAL_ART: TerminalLine[] = [
  blank(),
  line(span("        ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦", "orange")),
  line(span("", "orange")),
  line(span("        |  F E S T I V A L      |", "orange", true)),
  line(span("        |      W E E K          |", "amber", true)),
  line(span("", "orange")),
  line(span("        ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦", "orange")),
  blank(),
];

export const DAWN_ART: TerminalLine[] = [
  line(span("    ·  ✦  ·     ✧     ·  ✦  ·", "dim")),
  line(span("  -----------------------------", "dim")),
  line(span("  ░░▒▒▓▓████  ☀  ████▓▓▒▒░░", "amber")),
  line(span("  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓", "amber")),
];

export const EVENING_ART: TerminalLine[] = [
  line(span("                           ☽", "amber")),
  line(span("    ·  ✧  ·     ·     ·  ✧  ·", "dim")),
  line(span("  -----------------------------", "dim")),
  line(span("    ✦     ✦     ✦     ✦     ✦", "orange")),
];

export const DOOR_SLAMMED_ART: TerminalLine[] = [
  line(span("", "red")),
  line(span("    |  ✗ REFUSED ✗  |", "red", true)),
  line(span("", "red")),
];

export const HANDSHAKE_ART: TerminalLine[] = [
  line(span("", "green")),
  line(span("    |  ★ TRUSTED  ★     |", "green", true)),
  line(span("    |    PARTNER        |", "green")),
  line(span("", "green")),
];

export const WEEKLY_REPORT_ART: TerminalLine[] = [
  blank(),
  line(span("", "amber")),
  line(span("    |  WEEKLY  LEDGER       |", "amber", true)),
  line(span("", "amber")),
  line(span("", "dim")),
  line(span("    |  |   Summary     |    |", "dim")),
  line(span("", "dim")),
  line(span("", "amber")),
  blank(),
];

// -- AGENT SPECIALTY PORTRAITS (for AI-generated agents) -----

export const SPECIALTY_ART: Record<string, TerminalLine[]> = {
  trade: [
    line(span("       +-+", "gold")),
    line(span("    +--+¤+--+", "gold")),
    line(span("    |  (◆◆)  |", "gold")),
    line(span("    |  +-+  |  ", "gold"), span("Trader", "gold", true)),
    blank(),
  ],
  scout: [
    line(span("      +--+", "teal")),
    line(span("    +-+✦✦+-+", "teal")),
    line(span("    | (◇ ◇) |", "teal")),
    line(span("    |  +-+  |  ", "teal"), span("Scout", "teal", true)),
    blank(),
  ],
  investigation: [
    line(span("      +--+", "purple")),
    line(span("    +-+??+-+", "purple")),
    line(span("    | (◆ ◆) |", "purple")),
    line(span("    |  +-+  |  ", "purple"), span("Investigator", "purple", true)),
    blank(),
  ],
  branding: [
    line(span("", "orange")),
    line(span("", "orange")),
    line(span("    ||★  ★||", "orange")),
    line(span("", "orange"), span("Promoter", "orange", true)),
    line(span("    +==╤===+", "orange")),
  ],
  diplomacy: [
    line(span("      +--+", "green")),
    line(span("    +-+◇◆+-+", "green")),
    line(span("    | (◆ ◇) |", "green")),
    line(span("    |  +-+  |  ", "green"), span("Diplomat", "green", true)),
    blank(),
  ],
};

// ===============================================================
// NARRATOR DIALOGUE — Hakim the Ledger-Keeper
// ===============================================================

export function hakimIntro(): TerminalLine[] {
  return [
    ...HAKIM_PORTRAIT,
    blank(),
    line(span("  \"Ahh, another ambitious soul at the gates of the Grand Bazaar!", "gold")),
    line(span("   I am ", "gold"), span("Hakim", "amber", true), span(", Keeper of the Velvet Ledger.", "gold")),
    blank(),
    line(span("   For thirty years I have watched merchants rise and fall", "gold")),
    line(span("   in these spice-scented lanes. Some left with fortunes.", "gold")),
    line(span("   Most left with receipts and regret.", "gold")),
    blank(),
    line(span("   But you... you have a certain look. Hungry. Reckless.", "gold")),
    line(span("   Perhaps a little confused. That is the correct state", "gold")),
    line(span("   of mind for this business.\"", "gold")),
    blank(),
    line(span("  \"Now then. Let us begin with the most important question...\"", "gold")),
    blank(),
  ];
}

export function hakimNamePrompt(): TerminalLine[] {
  return [
    ...BRAND_NAMING_ART,
    blank(),
    line(span("  \"Every great bazaar enterprise needs a name.", "gold")),
    line(span("   Something that will echo through the market halls.", "gold")),
    line(span("   Something that will look splendid on a receipt.\"", "gold")),
    blank(),
    line(span("  What shall your trading brand be called?", "white", true)),
    blank(),
  ];
}

export function getCrewAssemblingArt(): TerminalLine[] {
  return [...CREW_ASSEMBLING_ART];
}

export function hakimNameResponse(name: string): TerminalLine[] {
  return [
    blank(),
    line(
      span("  \"", "gold"),
      span(name, "amber", true),
      span("! Yes, yes... I can see it on the ledgers already.", "gold"),
    ),
    line(span("   A fine name. Bold. Slightly pretentious. Perfect.\"", "gold")),
    blank(),
    line(span("  \"Let me introduce you to your operatives. A motley crew,", "gold")),
    line(span("   but they are the best the market district has to offer.", "gold")),
    line(span("   And by 'best' I mean 'available.'\"", "gold")),
    blank(),
  ];
}

export function hakimAgentIntro(agent: Agent, idx: number, total: number): TerminalLine[] {
  // Use predefined art for known agents, generic portrait for generated ones
  const art = AGENT_ART[agent.id];
  const lines: TerminalLine[] = [
    ...THIN_DIVIDER,
    line(span(`  Agent ${idx + 1} of ${total}`, "dim")),
    blank(),
  ];

  // Determine rarity from peak stat
  const maxStat = Math.max(
    Math.abs(agent.haggleBonus),
    Math.abs(agent.scoutBonus),
    Math.abs(agent.charmBonus),
  );
  const rarity = maxStat >= 27 ? { label: "LEGENDARY", color: "purple" as const }
    : maxStat >= 22 ? { label: "RARE", color: "gold" as const }
    : maxStat >= 15 ? { label: "UNCOMMON", color: "teal" as const }
    : { label: "COMMON", color: "dim" as const };

  if (art) {
    lines.push(...art);
    if (rarity.label !== "COMMON") {
      lines.push(indented(4, span(`[${rarity.label}]`, rarity.color, true)));
    }
  } else {
    // Specialty-based portrait for AI-generated agents
    const specialtyPortrait = SPECIALTY_ART[agent.specialty] || SPECIALTY_ART.trade;
    lines.push(...specialtyPortrait!);
    lines.push(blank());
    lines.push(line(
      span(`    ${agent.emoji} `, "white"),
      span(agent.name, "cyan", true),
      rarity.label !== "COMMON"
        ? span(`  [${rarity.label}]`, rarity.color, true)
        : span("", "dim"),
    ));
    lines.push(line(
      span(`      ${agent.title}`, "dim"),
    ));
  }

  lines.push(blank());

  if (agent.description) {
    lines.push(indented(4, span(`"${agent.description}"`, "dim")));
    lines.push(blank());
  }

  if (agent.quirk) {
    lines.push(indented(4, span("Quirk: ", "orange"), span(agent.quirk, "dim")));
    lines.push(blank());
  }

  lines.push(indented(4,
    span("Haggle: ", "dim"),
    span(`${agent.haggleBonus > 0 ? "+" : ""}${agent.haggleBonus}`, agent.haggleBonus > 0 ? "green" : "red"),
    span("  Scout: ", "dim"),
    span(`${agent.scoutBonus > 0 ? "+" : ""}${agent.scoutBonus}`, agent.scoutBonus > 0 ? "green" : "red"),
    span("  Charm: ", "dim"),
    span(`${agent.charmBonus > 0 ? "+" : ""}${agent.charmBonus}`, agent.charmBonus > 0 ? "green" : "red"),
  ));
  lines.push(indented(4,
    span("Risk: ", "dim"),
    span(`${Math.round(agent.riskFactor * 100)}%`, "orange"),
    span("  Fee: ", "dim"),
    span(`${agent.costPerMission}`, "gold"),
    span("¤ per mission", "dim"),
  ));
  lines.push(blank());

  // Hakim's comment — use predefined for known agents, generic for generated
  const comments: Record<string, string> = {
    "pepper-jack": "\"Pepper Jack has made me money. He has also made me enemies. Both are useful.\"",
    "auntie-null": "\"Auntie Null will tell you things you don't want to hear. That is why she's expensive.\"",
    "ledger-pup": "\"The fourth model. Don't ask about models one through three. We don't talk about that.\"",
    "marquis-samples": "\"The Marquis is chaos with a top hat. Budget accordingly.\"",
    "crow-sigma": "\"A crow in a waistcoat. Cheap, opinionated, and oddly effective.\"",
  };

  if (comments[agent.id]) {
    lines.push(indented(2, span(comments[agent.id], "gold")));
  } else {
    // Generic Hakim commentary based on specialty
    const specialtyComments: Record<string, string[]> = {
      trade: [
        "\"A trader. Good. We always need someone willing to argue about prices.\"",
        "\"This one knows the value of a good haggle. Or at least claims to.\"",
      ],
      scout: [
        "\"An intelligence specialist. The bazaar's secrets are currency, and this one trades in them.\"",
        "\"Information is power. This agent knows where to find it — and what it costs.\"",
      ],
      investigation: [
        "\"An investigator. Useful when things smell... suspicious. Which is always, here.\"",
        "\"This one sees what others miss. Sometimes that is a blessing. Sometimes a curse.\"",
      ],
      branding: [
        "\"A brand specialist! Because in this bazaar, perception IS reality.\"",
        "\"They say this one could sell sand in a desert. I believe them.\"",
      ],
      diplomacy: [
        "\"A diplomat. Someone who can smile while being insulted. Essential in this business.\"",
        "\"Charm opens doors that money cannot. This one has charm to spare.\"",
      ],
    };
    const pool = specialtyComments[agent.specialty] || specialtyComments.trade!;
    lines.push(indented(2, span(pool[idx % pool.length], "gold")));
  }

  lines.push(blank());
  return lines;
}

export function hakimMorningBrief(state: GameState): TerminalLine[] {
  const rep = getReputationTier(state.reputation);
  const cash = getCashTier(state.cash);
  const idleAgents = state.agents.filter(a => a.status === "idle");
  const week = state.campaign?.week ?? 1;

  // Different greetings based on state — expanded pool
  let greeting: string;
  if (state.day === 1) {
    greeting = "\"The sun rises on your first day in the bazaar. Let us see what fortune has in store.\"";
  } else if (state.cash < 15) {
    greeting = "\"We are dangerously close to ruin. Every coin must count today.\"";
  } else if (state.cash < 30) {
    greeting = "\"Dawn again... and our purse is looking rather thin. We must be strategic today.\"";
  } else if (state.cash > 300) {
    greeting = "\"Another glorious morning! With this much gold, even the nobles will take our calls.\"";
  } else if (state.reputation > 70) {
    greeting = "\"The bazaar whispers your name with respect now. Let us not disappoint them.\"";
  } else if (state.reputation > 50) {
    greeting = "\"Our reputation grows. The merchants nod when we pass. A promising sign.\"";
  } else if (state.campaign?.rivalBrand && state.reputation < state.campaign.rivalReputation) {
    greeting = `\"The Crimson Ledger is outpacing us. Their reputation stands at ${state.campaign.rivalReputation}. We must move faster.\"`;
  } else if (week === 4) {
    greeting = "\"The final week. The Championship awaits. Every mission counts now.\"";
  } else {
    const greetings = [
      "\"Another day, another opportunity to either profit or panic. I prefer profit.\"",
      "\"The spice lanes await! I have checked our ledgers. We are still solvent. Barely.\"",
      "\"Good morning! The merchants are stirring, the gossip crows are gossiping. Time to work.\"",
      "\"Rise and shine! The market bell has rung. Somewhere, a deal awaits. Or a trap.\"",
      "\"The aroma of cinnamon and ambition fills the air. Let us make our mark.\"",
      "\"I consulted the stars last night. They said 'try harder.' Helpful as always.\"",
      "\"Dawn breaks. The counterparties are sharpening their pencils. So should we.\"",
      "\"Another morning in the bazaar. The permit goblins are already queuing. Bad sign.\"",
    ];
    greeting = greetings[state.day % greetings.length];
  }

  const lines: TerminalLine[] = [
    ...buildDawnHeader(state.day, week),
    indented(2, span(greeting, "gold")),
    blank(),
    ...THIN_DIVIDER,
    blank(),
    indented(4,
      span("Treasury: ", "dim"),
      span(`${cash.emoji} ${state.cash}`, "gold", true),
      span(" (", "dim"),
      span(cash.name, state.cash > 100 ? "green" : state.cash > 30 ? "amber" : "red"),
      span(")", "dim"),
    ),
    indented(4,
      span("Reputation: ", "dim"),
      span(`${rep.emoji} ${state.reputation}/100`, "purple"),
      span(` (${rep.name})`, "dim"),
    ),
    indented(4,
      span("Agents: ", "dim"),
      span(`${idleAgents.length}/${state.agents.length}`, "cyan"),
      span(" idle", "dim"),
    ),
    indented(4,
      span("Missions completed: ", "dim"),
      span(`${state.completedMissions.length}`, "white"),
    ),
    blank(),
  ];

  // Latest rumor
  if (state.rumors.length > 0) {
    const latestRumor = state.rumors[state.rumors.length - 1];
    lines.push(indented(4, span("Latest rumor: ", "orange"), span(`"${latestRumor}"`, "dim")));
    lines.push(blank());
  }

  return lines;
}

// ===============================================================
// SCREEN CONTENT BUILDERS
// ===============================================================

export function buildDistrictChoices(state: GameState): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const districts = state.districts.filter(d => d.isUnlocked);
  const lines: TerminalLine[] = [
    blank(),
    line(span("  \"Where shall we send our agents today?\"", "gold")),
    blank(),
  ];

  const choices: TerminalChoice[] = [];

  districts.forEach((d, i) => {
    const art = DISTRICT_ART[d.id] || [];
    lines.push(...art);
    lines.push(indented(4,
      span("Danger: ", "dim"),
      span("!".repeat(d.dangerLevel), "red"),
      span("  Wealth: ", "dim"),
      span("$".repeat(d.wealthLevel), "green"),
    ));
    lines.push(blank());

    choices.push({
      key: `${i + 1}`,
      label: `${d.emoji} ${d.name}`,
      action: "SELECT_DISTRICT",
      data: d.id,
    });
  });

  choices.push({ key: "b", label: "Back to morning brief", action: "BACK" });

  return { lines, choices };
}

export function buildMissionChoices(state: GameState, districtId: string): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const district = state.districts.find(d => d.id === districtId)!;
  const lines: TerminalLine[] = [
    blank(),
    line(span(`  Missions available in `, "dim"), span(`${district.emoji} ${district.name}`, "gold", true), span(":", "dim")),
    blank(),
  ];

  const choices: TerminalChoice[] = [];

  district.availableMissions.forEach((m, i) => {
    lines.push(indented(4,
      span(`[${i + 1}] `, "amber"),
      span(m.name, "white", true),
      span(` (${m.type})`, "dim"),
    ));
    lines.push(indented(6, span(m.description, "dim")));
    lines.push(indented(6,
      span("Budget: ", "dim"),
      span(`${m.baseBudget}`, "gold"),
      span("  Reward: ", "dim"),
      span(`~${m.baseReward}`, "green"),
      span("  Risk: ", "dim"),
      span("!".repeat(m.riskLevel), "red"),
    ));

    // Show action sequence
    const actionLabels = m.actionSequence.map(a => ACTION_TYPE_INFO[a].emoji + " " + ACTION_TYPE_INFO[a].label);
    lines.push(indented(6,
      span("Route: ", "dim"),
      span(actionLabels.join(" -> "), "teal"),
    ));
    lines.push(blank());

    choices.push({
      key: `${i + 1}`,
      label: m.name,
      action: "SELECT_MISSION",
      data: m.id,
    });
  });

  choices.push({ key: "b", label: "Back to districts", action: "BACK" });
  return { lines, choices };
}

export function buildAgentChoices(state: GameState, missionType?: string): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const idle = state.agents.filter(a => a.status === "idle");
  const lines: TerminalLine[] = [
    blank(),
    line(span("  \"Who shall carry our hopes and our money into the bazaar?\"", "gold")),
    blank(),
  ];

  const choices: TerminalChoice[] = [];

  if (idle.length === 0) {
    lines.push(indented(4, span("No agents available. All deployed.", "red")));
    lines.push(blank());
  } else {
    idle.forEach((a, i) => {
      lines.push(indented(4,
        span(`[${i + 1}] `, "amber"),
        span(`${a.emoji} ${a.name}`, "cyan", true),
        span(` — ${a.title}`, "dim"),
      ));
      lines.push(indented(6,
        span("Haggle:", "dim"), span(`${a.haggleBonus > 0 ? "+" : ""}${a.haggleBonus}`, a.haggleBonus > 0 ? "green" : "red"),
        span(" Scout:", "dim"), span(`${a.scoutBonus > 0 ? "+" : ""}${a.scoutBonus}`, a.scoutBonus > 0 ? "green" : "red"),
        span(" Charm:", "dim"), span(`${a.charmBonus > 0 ? "+" : ""}${a.charmBonus}`, a.charmBonus > 0 ? "green" : "red"),
        span(` Fee:`, "dim"), span(`${a.costPerMission}`, "gold"),
        span(" Morale:", "dim"), span(`${a.morale}%`, a.morale > 50 ? "green" : "orange"),
      ));
      lines.push(blank());

      choices.push({
        key: `${i + 1}`,
        label: `${a.emoji} ${a.name} (${a.costPerMission} fee)`,
        action: "SELECT_AGENT",
        data: a.id,
      });
    });
  }

  choices.push({ key: "b", label: "Back to missions", action: "BACK" });
  return { lines, choices };
}

export function buildBudgetChoices(state: GameState, mission: MissionTemplate, agent: Agent): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const maxAffordable = Math.min(state.cash - agent.costPerMission, 80);
  const low = Math.max(5, Math.round(mission.baseBudget * 0.6));
  const standard = mission.baseBudget;
  const generous = Math.min(Math.round(mission.baseBudget * 1.4), maxAffordable);
  const allIn = maxAffordable;

  const lines: TerminalLine[] = [
    blank(),
    line(span("  \"How much shall we invest in this venture?\"", "gold")),
    blank(),
    indented(4, span("Available: ", "dim"), span(`${state.cash}`, "gold"), span(" (-", "dim"), span(`${agent.costPerMission}`, "orange"), span(` agent fee = `, "dim"), span(`${maxAffordable}`, "gold"), span(" max budget)", "dim")),
    blank(),
  ];

  const choices: TerminalChoice[] = [
    { key: "1", label: `Conservative (${low}) — lower risk, lower reward`, action: "SET_BUDGET", data: low },
    { key: "2", label: `Standard (${standard}) — recommended`, action: "SET_BUDGET", data: standard },
    { key: "3", label: `Generous (${generous}) — better odds`, action: "SET_BUDGET", data: generous },
    { key: "4", label: `All-in (${allIn}) — go big or go home`, action: "SET_BUDGET", data: allIn },
  ];

  choices.push({ key: "b", label: "Back to agents", action: "BACK" });
  return { lines, choices };
}

export function buildPostureChoices(): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const lines: TerminalLine[] = [
    blank(),
    line(span("  \"And the approach? Every deal has a temperament.\"", "gold")),
    blank(),
  ];

  const choices: TerminalChoice[] = [
    { key: "1", label: "Cautious  -- steady and safe, lower spend, lower ceiling", action: "SET_POSTURE", data: "cautious" },
    { key: "2", label: "Balanced  -- sensible default, standard risk/reward", action: "SET_POSTURE", data: "balanced" },
    { key: "3", label: "Reckless  -- higher success chance but higher spend", action: "SET_POSTURE", data: "reckless" },
    { key: "4", label: "Theatrical -- wild card. spectacular outcomes, good OR bad", action: "SET_POSTURE", data: "theatrical" },
  ];

  choices.push({ key: "b", label: "Back to budget", action: "BACK" });
  return { lines, choices };
}

export function buildDispatchConfirmation(
  state: GameState,
  districtId: string,
  missionId: string,
  agentId: string,
  budget: number,
  posture: string,
): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const district = state.districts.find(d => d.id === districtId)!;
  const mission = district.availableMissions.find(m => m.id === missionId)!;
  const agent = state.agents.find(a => a.id === agentId)!;
  const totalCost = budget + agent.costPerMission;

  const lines: TerminalLine[] = [
    blank(),
    ...THIN_DIVIDER,
    line(span("  MISSION DISPATCH SUMMARY", "amber", true)),
    ...THIN_DIVIDER,
    blank(),
    indented(4, span("Agent:    ", "dim"), span(`${agent.emoji} ${agent.name}`, "cyan", true)),
    indented(4, span("District: ", "dim"), span(`${district.emoji} ${district.name}`, "gold")),
    indented(4, span("Mission:  ", "dim"), span(mission.name, "white", true)),
    indented(4, span("Budget:   ", "dim"), span(`${budget}`, "gold")),
    indented(4, span("Fee:      ", "dim"), span(`${agent.costPerMission}`, "orange")),
    indented(4, span("Total:    ", "dim"), span(`${totalCost}`, "gold", true)),
    indented(4, span("Posture:  ", "dim"), span(posture, posture === "theatrical" ? "purple" : posture === "reckless" ? "red" : "white")),
    blank(),
    line(span(`  \"Shall we dispatch ${agent.name}? Total cost: ${totalCost} from our ${state.cash} treasury.\"`, "gold")),
    blank(),
  ];

  const choices: TerminalChoice[] = [
    { key: "1", label: "Dispatch!", action: "CONFIRM_DISPATCH" },
    { key: "2", label: "Go back and change something", action: "BACK_TO_DISTRICT" },
  ];

  return { lines, choices };
}

export function buildDispatchMoreChoices(state: GameState): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const idle = state.agents.filter(a => a.status === "idle");
  const active = state.activeMissions;

  const lines: TerminalLine[] = [
    blank(),
    ...THIN_DIVIDER,
    line(span(`  Dispatched today: ${active.length} mission${active.length !== 1 ? "s" : ""}`, "amber")),
    ...THIN_DIVIDER,
    blank(),
  ];

  active.forEach(m => {
    lines.push(indented(4,
      span(`${m.agent.emoji} ${m.agent.name}`, "cyan"),
      span(" -> ", "dim"),
      span(`${m.district.emoji} ${m.template.name}`, "gold"),
      span(` (${m.budget} + ${m.agent.costPerMission} fee, ${m.riskPosture})`, "dim"),
    ));
  });

  lines.push(blank());

  if (idle.length > 0 && state.cash > 10) {
    lines.push(line(span(`  ${idle.length} agent${idle.length !== 1 ? "s" : ""} idle, ${state.cash} in treasury.`, "dim")));
    lines.push(blank());
  }

  const choices: TerminalChoice[] = [];
  if (idle.length > 0 && state.cash > 10) {
    choices.push({ key: "1", label: "Dispatch another mission", action: "DISPATCH_ANOTHER" });
  }
  choices.push({ key: "2", label: "Send agents into the bazaar! (Resolve Day)", action: "RESOLVE" });

  return { lines, choices };
}

export function buildResolvingScreen(): TerminalLine[] {
  return [
    blank(),
    ...RESOLVING_ART,
    blank(),
    line(span("  \"Our agents are out in the field...", "gold")),
    line(span("   Negotiating. Haggling. Possibly insulting nobles.", "gold")),
    line(span("   We wait.\"", "gold")),
    blank(),
    line(span("  Settling transactions...", "teal")),
    blank(),
  ];
}

export function buildMissionNarrative(mission: ActiveMission): TerminalLine[] {
  const r = mission.result!;
  const lines: TerminalLine[] = [
    blank(),
    ...THIN_DIVIDER,
    line(
      span(`  ${mission.agent.emoji} `, "white"),
      span(mission.agent.name, "cyan", true),
      span(" — ", "dim"),
      span(mission.template.name, "white"),
    ),
    line(span(`  ${mission.district.emoji} ${mission.district.name} | ${mission.riskPosture} posture`, "dim")),
    ...THIN_DIVIDER,
    blank(),
    ...(r.success ? SUCCESS_ART : FAILURE_ART),
    blank(),
    indented(2, span(`"${r.headline}"`, "gold", true)),
    blank(),
  ];

  // Action step trail
  if (r.actionSteps.length > 0) {
    lines.push(line(span("  Interaction Trail:", "amber")));
    lines.push(blank());

    r.actionSteps.forEach((step, i) => {
      const info = ACTION_TYPE_INFO[step.actionType];
      lines.push(indented(4,
        span(`${i + 1}. `, "dim"),
        span(`${step.counterpartyEmoji} ${step.counterpartyName}`, "white"),
        span(` [${info.emoji} ${info.label}]`, "teal"),
        span(step.success ? " +" : " x", step.success ? "green" : "red"),
      ));

      // AI-generated dialogue scene
      if (step.scene?.dialogue && step.scene.dialogue.length > 0) {
        lines.push(blank());
        step.scene.dialogue.forEach(d => {
          lines.push(indented(6,
            span(`${d.speaker}: `, "cyan"),
            span(`"${d.line}"`, "white"),
          ));
        });
        lines.push(blank());
        if (step.scene.agent_reasoning) {
          lines.push(indented(6,
            span(`[Agent thinks: `, "dim"),
            span(step.scene.agent_reasoning, "amber"),
            span(`]`, "dim"),
          ));
        }
        if (step.scene.counterparty_reaction) {
          lines.push(indented(6,
            span(`[Counterparty is `, "dim"),
            span(step.scene.counterparty_reaction, step.scene.counterparty_reaction === "pleased" || step.scene.counterparty_reaction === "impressed" ? "green" : step.scene.counterparty_reaction === "annoyed" || step.scene.counterparty_reaction === "suspicious" ? "red" : "dim"),
            span(`]`, "dim"),
          ));
        }
        lines.push(blank());
      } else {
        lines.push(indented(6, span(step.description, "dim")));
      }

      // x402/MPP Protocol Exchange
      if (step.receipt?.x402Flow && step.receipt.x402Flow.length > 0) {
        lines.push(blank());
        lines.push(indented(6, span("x402/MPP Protocol:", "teal", true)));
        step.receipt.x402Flow.forEach(x => {
          const color = x.type === "response_402" ? "orange" as const
            : x.type === "mpp_verify" || x.type === "response_200" ? "green" as const
            : x.type === "payment" ? "teal" as const
            : "dim" as const;
          lines.push(indented(8, span(x.label, color)));
        });
        lines.push(blank());
      }

      lines.push(indented(6,
        span(`Cost: ${step.cost}`, "gold"),
        span(` | Settlement: ${step.settlementMode}`, "teal"),
        step.receipt?.receiptId ? span(` | Receipt: ${step.receipt.receiptId}`, "dim") : span("", "dim"),
      ));
      if (step.stellarTxId) {
        lines.push(indented(6, span(`Stellar TX: ${step.stellarTxId.slice(0, 24)}...`, "teal")));
      }
      lines.push(blank());
    });
  }

  // Financials
  lines.push(line(span("  Financial Summary:", "amber")));
  lines.push(indented(4,
    span("Spent: ", "dim"), span(`${r.moneySpent}`, "red"),
    span("  Earned: ", "dim"), span(`${r.moneyEarned}`, "green"),
    span("  Net: ", "dim"), span(`${r.netProfit >= 0 ? "+" : ""}${r.netProfit}`, r.netProfit >= 0 ? "green" : "red", true),
  ));
  if (r.reputationChange !== 0) {
    lines.push(indented(4,
      span("Reputation: ", "dim"),
      span(`${r.reputationChange > 0 ? "+" : ""}${r.reputationChange}`, r.reputationChange > 0 ? "purple" : "orange"),
    ));
  }

  // Details
  lines.push(blank());
  r.details.forEach(d => {
    lines.push(indented(4, span(d, "dim")));
  });

  lines.push(blank());
  return lines;
}

export function buildDailyReport(state: GameState): TerminalLine[] {
  const report = state.dailyReport;
  if (!report) {
    return [
      blank(),
      line(span("  No report available for this day.", "dim")),
      blank(),
    ];
  }

  const lines: TerminalLine[] = [
    blank(),
    ...buildEveningHeader(report.day),
    ...ORNAMENTAL_DIVIDER,
    blank(),
    indented(4,
      span("Missions: ", "dim"), span(`${report.missionsRun}`, "white"),
      span("  Earned: ", "dim"), span(`${report.totalEarned}`, "green"),
      span("  Spent: ", "dim"), span(`${report.totalSpent}`, "red"),
    ),
    indented(4,
      span("Net P&L: ", "dim"),
      span(`${report.netChange >= 0 ? "+" : ""}${report.netChange}`, report.netChange >= 0 ? "green" : "red", true),
      span("  Rep: ", "dim"),
      span(`${report.reputationChange >= 0 ? "+" : ""}${report.reputationChange}`, report.reputationChange >= 0 ? "purple" : "orange"),
    ),
    blank(),
  ];

  // Hakim commentary
  if (report.netChange > 0) {
    lines.push(indented(2, span("\"A profitable day! The ledger smiles upon us.\"", "gold")));
  } else if (report.netChange === 0) {
    lines.push(indented(2, span("\"We broke even. Not exciting, but not ruinous.\"", "gold")));
  } else {
    lines.push(indented(2, span("\"Losses today. The bazaar giveth and the bazaar taketh. Mostly taketh.\"", "gold")));
  }

  if (report.rumors.length > 0) {
    lines.push(blank());
    lines.push(line(span("  Intel gathered:", "orange")));
    report.rumors.forEach(r => {
      lines.push(indented(4, span(`"${r}"`, "dim")));
    });
  }

  lines.push(blank());
  lines.push(indented(2, span(`Treasury: ${state.cash}  |  Reputation: ${state.reputation}/100`, "amber")));
  lines.push(blank());

  return lines;
}

// Side views
export function buildAgentRosterView(state: GameState): TerminalLine[] {
  const lines: TerminalLine[] = [
    blank(),
    line(span("  AGENT ROSTER", "amber", true)),
    ...THIN_DIVIDER,
    blank(),
  ];

  state.agents.forEach(a => {
    const art = AGENT_ART[a.id] || [];
    lines.push(...art);
    lines.push(indented(4,
      span("Status: ", "dim"), span(a.status, a.status === "idle" ? "green" : "orange"),
      span("  Morale: ", "dim"), span(`${a.morale}%`, a.morale > 50 ? "green" : "red"),
      span("  Missions: ", "dim"), span(`${a.missionsCompleted}`, "white"),
    ));
    lines.push(blank());
  });

  return lines;
}

export function buildNetworkView(state: GameState): TerminalLine[] {
  const lines: TerminalLine[] = [
    blank(),
    line(span("  MARKET NETWORK", "amber", true)),
    ...THIN_DIVIDER,
    blank(),
    indented(4,
      span("Total transactions: ", "dim"), span(`${state.networkStats.totalTransactions}`, "white"),
      span("  Counterparties: ", "dim"), span(`${state.networkStats.counterpartiesUsed}/${state.counterparties.length}`, "teal"),
    ),
    blank(),
  ];

  state.counterparties.forEach(cp => {
    const moodColor = cp.mood === "cooperative" ? "green" : cp.mood === "hostile" ? "red" : cp.mood === "chaotic" ? "purple" : "dim";
    lines.push(indented(4,
      span(`${cp.emoji} `, "white"),
      span(cp.name, "white", true),
      span(` (${cp.type})`, "dim"),
    ));
    lines.push(indented(6,
      span("Mood: ", "dim"), span(cp.mood, moodColor),
      span("  Reliable: ", "dim"), span(`${Math.round(cp.reliability * 100)}%`, "green"),
      span("  Greed: ", "dim"), span(`${Math.round(cp.greedFactor * 100)}%`, "red"),
      span("  Txns: ", "dim"), span(`${cp.interactionCount}`, "teal"),
    ));
    lines.push(blank());
  });

  return lines;
}

export function buildLedgerView(state: GameState): TerminalLine[] {
  const lines: TerminalLine[] = [
    blank(),
    line(span("  RECEIPT LEDGER", "amber", true)),
    ...THIN_DIVIDER,
    blank(),
  ];

  const allReceipts = state.completedMissions
    .flatMap(m => (m.result?.actionSteps ?? []).map(s => ({ step: s, mission: m })))
    .reverse()
    .slice(0, 20);

  if (allReceipts.length === 0) {
    lines.push(indented(4, span("No receipts yet. Complete some missions first.", "dim")));
  } else {
    allReceipts.forEach(({ step, mission }) => {
      const r = step.receipt;
      lines.push(indented(4,
        span(step.success ? "+" : "x", step.success ? "green" : "red"),
        span(` ${step.counterpartyName}`, "white"),
        span(` [${ACTION_TYPE_INFO[step.actionType].label}]`, "teal"),
        span(` ${step.cost}`, "gold"),
        span(` ${step.settlementMode}`, step.settlementMode === "testnet" ? "teal" : "dim"),
      ));
      if (r) {
        lines.push(indented(6, span(r.receiptId, "dim")));
        if (r.stellarTxId) {
          lines.push(indented(6, span(`TX: ${r.stellarTxId.slice(0, 32)}...`, "teal")));
        }
      }
    });
  }

  lines.push(blank());
  return lines;
}

export function buildRumorsView(state: GameState): TerminalLine[] {
  const lines: TerminalLine[] = [
    blank(),
    line(span("  RUMOR FEED", "amber", true)),
    ...THIN_DIVIDER,
    blank(),
    indented(2, span("\"The gossip crows report the following...\"", "gold")),
    blank(),
  ];

  if (state.rumors.length === 0) {
    lines.push(indented(4, span("No rumors yet.", "dim")));
  } else {
    [...state.rumors].reverse().forEach(r => {
      lines.push(indented(4, span(`  "${r}"`, "dim")));
    });
  }

  lines.push(blank());
  return lines;
}

// ===============================================================
// STELLAR ONBOARDING
// ===============================================================

const STELLAR_ART: TerminalLine[] = [
  blank(),
  line(span("      ✦         ✧         ✦         ✧", "dim")),
  line(span("          ✧         ·         ✧", "dim")),
  line(span("   ·         ✦         ✦         ✦         ·", "dim")),
  blank(),
  line(span("", "teal")),
  line(span("    |                                   |", "teal")),
  title("✦ Stellar ✦", "teal", "1.4em", true),
  line(span("    |       N E T W O R K              |", "teal")),
  line(span("    |                                   |", "teal")),
  line(span("    |   ◇ --- ◆ --- ◇ --- ◆ --- ◇     |", "teal")),
  line(span("    |   |     |     |     |     |       |", "dim")),
  line(span("    |   ◆ --- ◇ --- ◆ --- ◇ --- ◆     |", "teal")),
  line(span("    |                                   |", "teal")),
  line(span("", "teal")),
  blank(),
  line(span("       A cosmic ledger written in starlight.", "dim")),
  blank(),
];

export function hakimWalletRequired(): TerminalLine[] {
  return [
    ...ORNAMENTAL_DIVIDER,
    blank(),
    ...WALLET_ART,
    blank(),
    line(span("  \"Before we go any further, you need to prove", "gold")),
    line(span("   who you are. The bazaar has rules.", "gold")),
    line(span("   Well, it has guidelines. Suggestions, really.", "gold")),
    line(span("   But this one is non-negotiable.\"", "gold")),
    blank(),
    line(span("  Hakim taps the crystal ledger.", "dim")),
    blank(),
    line(span("  \"Your identity will be sealed with a ", "gold"), span("passkey", "teal", true), span(".", "gold")),
    line(span("   A touch of your finger. A glance of your face.", "gold")),
    line(span("   The Stellar network will know you — and only you.", "gold")),
    blank(),
    line(span("   No passwords to forget. No seed phrases to lose.", "gold")),
    line(span("   Just you and the cosmic ledger.\"", "gold")),
    blank(),
    line(span("  \"Once connected, I can assemble a crew of agents", "gold")),
    line(span("   unique to your enterprise. The stars will choose", "gold")),
    line(span("   them for you.\"", "gold")),
    blank(),
  ];
}

export function hakimStellarIntro(): TerminalLine[] {
  return [
    ...ORNAMENTAL_DIVIDER,
    blank(),
    ...STELLAR_ART,
    blank(),
    line(span("  \"Now, before we open for business, there is one", "gold")),
    line(span("   more matter to discuss. A delicate one.\"", "gold")),
    blank(),
    line(span("  Hakim produces a shimmering crystal ledger from", "dim")),
    line(span("  beneath his robes. It glows faintly teal.", "dim")),
    blank(),
    line(span("  \"This is the ", "gold"), span("Stellar Ledger", "teal", true), span(".", "gold")),
    blank(),
    line(span("   In the old days, every transaction was scribbled", "gold")),
    line(span("   on parchment. Easy to forge. Easy to lose.", "gold")),
    line(span("   Easy for the Permit Goblins to 'accidentally' misfile.", "gold")),
    blank(),
    line(span("   But now... now we have something better.", "gold")),
    line(span("   The Stellar network. A cosmic ledger written in starlight.", "gold")),
    line(span("   Every payment, every receipt — sealed among the stars.\"", "gold")),
    blank(),
    line(span("  He holds up the crystal.", "dim")),
    blank(),
    line(span("  \"You have two paths:", "gold")),
    blank(),
    line(span("   The ", "gold"), span("Simulated", "amber", true), span(" path — all transactions stay local.", "gold")),
    line(span("   Safe. Private. No connection to the outside world.", "gold")),
    line(span("   Perfect for those who prefer their ledgers... fictional.\"", "gold")),
    blank(),
    line(span("   The ", "gold"), span("Stellar Testnet", "teal", true), span(" path — real transactions on", "gold")),
    line(span("   the Stellar test network. Real receipts. Real transaction", "gold")),
    line(span("   hashes you can verify among the stars. Your agents'", "gold")),
    line(span("   payments will be written in the cosmic ledger itself.\"", "gold")),
    blank(),
    line(span("  \"The testnet uses play money — no real funds at risk.", "gold")),
    line(span("   But the transactions are real. The receipts are real.", "gold")),
    line(span("   And the bragging rights? ", "gold"), span("Very", "amber", true), span(" real.\"", "gold")),
    blank(),
    line(span("  \"And the best part? No seed phrases. No extensions.", "gold")),
    line(span("   Just your fingerprint or face. One touch and", "gold")),
    line(span("   your bazaar wallet springs into existence.\"", "gold")),
    blank(),
    line(span("  \"Which path do you choose?\"", "gold")),
    blank(),
  ];
}

export function hakimPasskeyPrompt(): TerminalLine[] {
  return [
    blank(),
    line(span("  Hakim gestures toward a glowing sigil on the ledger.", "dim")),
    blank(),
    line(span("  \"Place your finger upon the seal.", "gold")),
    line(span("   The ledger will recognize you — and only you.", "gold")),
    line(span("   No passwords. No secret phrases.", "gold")),
    line(span("   Just you and the stars.\"", "gold")),
    blank(),
    line(span("  Your browser will prompt you to create a passkey...", "teal")),
    blank(),
  ];
}

export function hakimPasskeyConnected(address: string): TerminalLine[] {
  return [
    blank(),
    line(span("  The sigil flares bright. The ledger hums with recognition.", "dim")),
    blank(),
    indented(4, span("Smart Account: ", "dim"), span(address.slice(0, 20) + "...", "teal")),
    indented(4, span("Auth:          ", "dim"), span("Passkey (WebAuthn)", "green", true)),
    indented(4, span("Network:       ", "dim"), span("Stellar Testnet", "teal", true)),
    indented(4, span("Status:        ", "dim"), span("Funded & Ready", "green", true)),
    blank(),
    line(span("  \"The cosmic ledger knows your touch now.", "gold")),
    line(span("   Your agents' transactions will be sealed with", "gold")),
    line(span("   your identity. No one can forge your receipts.\"", "gold")),
    blank(),
    line(span("  \"And should you return to the bazaar in the future,", "gold")),
    line(span("   your passkey will remember you. The ledger forgets nothing.\"", "gold")),
    blank(),
  ];
}

export function hakimStellarConnecting(): TerminalLine[] {
  return [
    blank(),
    line(span("  Hakim holds the crystal ledger aloft.", "dim")),
    line(span("  It begins to pulse with teal light...", "dim")),
    blank(),
    line(span("  Connecting to the Stellar testnet...", "teal")),
    line(span("  Funding your bazaar wallet via the Stellar friendbot...", "teal")),
    blank(),
  ];
}

export function hakimStellarConnected(publicKey: string): TerminalLine[] {
  return [
    blank(),
    line(span("  The crystal hums. A constellation of characters appears:", "dim")),
    blank(),
    indented(4, span("Wallet:  ", "dim"), span(publicKey, "teal")),
    indented(4, span("Network: ", "dim"), span("Stellar Testnet", "teal", true)),
    indented(4, span("Status:  ", "dim"), span("Funded & Ready", "green", true)),
    blank(),
    line(span("  \"Excellent! The cosmic ledger is open.", "gold")),
    line(span("   Your paid intel, trades, permits, and logistics will now", "gold")),
    line(span("   settle as real Stellar transactions. Each receipt will", "gold")),
    line(span("   carry a transaction hash you can verify on the explorer.\"", "gold")),
    blank(),
    line(span("  \"The stars are watching your business now.", "gold")),
    line(span("   Try not to embarrass us.\"", "gold")),
    blank(),
  ];
}

export function hakimStellarFailed(error: string): TerminalLine[] {
  return [
    blank(),
    line(span("  The crystal flickers and dims.", "dim")),
    blank(),
    indented(4, span("Connection failed: ", "red"), span(error, "dim")),
    blank(),
    line(span("  \"Hmm. The stars are not cooperating today.", "gold")),
    line(span("   No matter — we shall proceed with simulated settlement.", "gold")),
    line(span("   You can try connecting again later from the morning brief.\"", "gold")),
    blank(),
  ];
}

export function hakimStellarSkipped(): TerminalLine[] {
  return [
    blank(),
    line(span("  \"Ah, the traditional path. Wise, perhaps.", "gold")),
    line(span("   Simulated settlement it is. Every transaction will be", "gold")),
    line(span("   recorded locally in our ledger. No cosmic entanglements.\"", "gold")),
    blank(),
    line(span("  \"You can always connect to the Stellar testnet later", "gold")),
    line(span("   from the morning brief. The stars are patient.\"", "gold")),
    blank(),
  ];
}

// ===============================================================
// AGENT NFTs (SEP-50)
// ===============================================================

export function buildNFTView(state: GameState, walletAddress?: string): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const lines: TerminalLine[] = [
    blank(),
    line(span("  AGENT NFTs", "teal", true), span(" — SEP-50", "dim")),
    ...THIN_DIVIDER,
    blank(),
  ];

  if (!walletAddress) {
    lines.push(indented(2, span("\"To mint your agents as NFTs, you must first", "gold")));
    lines.push(indented(2, span(" connect your Stellar wallet. The cosmic ledger", "gold")));
    lines.push(indented(2, span(" needs to know who you are.\"", "gold")));
    lines.push(blank());
    return { lines, choices: [{ key: "b", label: "Back to morning brief", action: "BACK" }] };
  }

  lines.push(indented(2, span("\"Your agents can be immortalized on the Stellar network.", "gold")));
  lines.push(indented(2, span(" Each minted agent becomes an NFT — a token that proves", "gold")));
  lines.push(indented(2, span(" this agent worked for you. Bring them to future runs.\"", "gold")));
  lines.push(blank());

  lines.push(line(span("  Your agents:", "amber")));
  lines.push(blank());

  const choices: TerminalChoice[] = [];

  state.agents.forEach((a, i) => {
    lines.push(indented(4,
      span(`[${i + 1}] `, "amber"),
      span(`${a.emoji} ${a.name}`, "cyan", true),
      span(` — ${a.title}`, "dim"),
    ));
    lines.push(indented(6,
      span(`Missions: ${a.missionsCompleted}`, "white"),
      span(`  Morale: ${a.morale}%`, a.morale > 50 ? "green" : "red"),
    ));
    lines.push(blank());

    choices.push({
      key: `${i + 1}`,
      label: `Mint ${a.emoji} ${a.name} as NFT`,
      action: "MINT_AGENT",
      data: a.id,
    });
  });

  choices.push({ key: "b", label: "Back to morning brief", action: "BACK" });
  return { lines, choices };
}

export function buildNFTMintedLines(agentName: string, tokenId: string, txHash?: string): TerminalLine[] {
  return [
    blank(),
    line(span("  The ledger glows. A new sigil appears...", "dim")),
    blank(),
    indented(4, span("Agent: ", "dim"), span(agentName, "cyan", true)),
    indented(4, span("Token: ", "dim"), span(tokenId, "teal")),
    txHash ? indented(4, span("TX:    ", "dim"), span(txHash.slice(0, 32) + "...", "teal")) : line(span("")),
    blank(),
    line(span("  \"This agent is now eternally yours. Bring them", "gold")),
    line(span("   to any future game. The stars remember.\"", "gold")),
    blank(),
  ];
}

// ===============================================================
// EVENT SCREENS
// ===============================================================

// ===============================================================
// RANDOM EVENT ART & DISPLAY
// ===============================================================

const EVENT_CATEGORY_ART: Record<string, TerminalLine[]> = {
  merchant: [
    line(span("", "gold")),
    line(span("    |  ◆ MERCHANT  ◆    |", "gold", true)),
    line(span("    |    ENCOUNTER      |", "amber")),
    line(span("", "gold")),
  ],
  stranger: [
    line(span("", "purple")),
    line(span("    |  ◇ MYSTERIOUS ◇   |", "purple", true)),
    line(span("    |     STRANGER      |", "purple")),
    line(span("", "purple")),
  ],
  disaster: [
    line(span("", "red")),
    line(span("    |  ░ MARKET  ░      |", "red", true)),
    line(span("    |   DISRUPTION      |", "orange")),
    line(span("", "red")),
  ],
  celebration: [
    line(span("", "orange")),
    line(span("    |  ✦ CELEBRATION ✦  |", "orange", true)),
    line(span("    |                   |", "amber")),
    line(span("", "orange")),
  ],
  agent: [
    line(span("", "cyan")),
    line(span("    |  ◆ AGENT  ◆       |", "cyan", true)),
    line(span("    |    EVENT          |", "cyan")),
    line(span("", "cyan")),
  ],
  mystery: [
    line(span("", "purple")),
    line(span("    |  ? ? MYSTERY ? ?  |", "purple", true)),
    line(span("    |                   |", "purple")),
    line(span("", "purple")),
  ],
};

import type { RandomEvent, RandomEventChoice } from "../events/randomEvents";

export function buildRandomEventScreen(event: RandomEvent): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const art = EVENT_CATEGORY_ART[event.artCategory] || EVENT_CATEGORY_ART.mystery;

  const lines: TerminalLine[] = [
    blank(),
    ...ORNAMENTAL_DIVIDER,
    blank(),
    ...art!,
    blank(),
    line(span(`  ${event.name}`, "amber", true)),
    blank(),
  ];

  // Hakim narration
  event.narration.forEach(n => {
    lines.push(indented(2, span(`"${n}"`, "gold")));
  });
  lines.push(blank());

  // Build choices
  const choices: TerminalChoice[] = event.choices.map((c, i) => ({
    key: `${i + 1}`,
    label: c.label,
    action: `EVENT_CHOICE_${i}`,
    data: i,
  }));

  // Show choice descriptions
  event.choices.forEach((c, i) => {
    lines.push(indented(4,
      span(`[${i + 1}] `, "amber"),
      span(c.label, "white", true),
    ));
    lines.push(indented(6, span(c.description, "dim")));
    if (c.effects.length > 0) {
      const effectStr = c.effects.map(e => e.description).join(", ");
      lines.push(indented(6, span(effectStr, c.effects[0].value >= 0 ? "green" : "orange")));
    }
    lines.push(blank());
  });

  return { lines, choices };
}

export function buildEventOutcome(choice: RandomEventChoice): TerminalLine[] {
  const lines: TerminalLine[] = [
    blank(),
    line(span(`  You chose: ${choice.label}`, "amber", true)),
    blank(),
  ];

  if (choice.effects.length === 0) {
    lines.push(indented(2, span("\"Sometimes the wisest choice is no choice at all.\"", "gold")));
  } else {
    lines.push(indented(2, span("\"And so it is done. The ledger records:\"", "gold")));
    lines.push(blank());
    choice.effects.forEach(e => {
      const color = e.value >= 0 ? "green" as const : "red" as const;
      lines.push(indented(4, span(`  ${e.description}`, color)));
    });
  }

  lines.push(blank());
  return lines;
}

export function buildDecisionPrompt(
  agentName: string,
  counterpartyName: string,
  decision: { prompt: string; option_a: { label: string; risk: number }; option_b: { label: string; risk: number } },
): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const lines: TerminalLine[] = [
    blank(),
    ...ORNAMENTAL_DIVIDER,
    blank(),
    line(span("  Hakim interrupts:", "gold", true)),
    blank(),
    indented(2, span(`"${decision.prompt}"`, "gold")),
    blank(),
    indented(4,
      span(`${agentName}`, "cyan"),
      span(" is dealing with ", "dim"),
      span(counterpartyName, "white"),
      span(".", "dim"),
    ),
    blank(),
  ];

  const choices: TerminalChoice[] = [
    {
      key: "1",
      label: `${decision.option_a.label} (Risk: ${"!".repeat(decision.option_a.risk)})`,
      action: "DECISION_A",
    },
    {
      key: "2",
      label: `${decision.option_b.label} (Risk: ${"!".repeat(decision.option_b.risk)})`,
      action: "DECISION_B",
    },
  ];

  return { lines, choices };
}

export function buildDecisionResult(choice: string, modifier: number): TerminalLine[] {
  const positive = modifier >= 0;
  return [
    blank(),
    indented(2, span(positive
      ? "\"A bold choice. Let us see how the stars respond.\""
      : "\"Hmm. A cautious path. Perhaps wise, perhaps not.\"",
      "gold")),
    indented(4,
      span("Outcome influence: ", "dim"),
      span(`${modifier >= 0 ? "+" : ""}${Math.round(modifier * 100)}%`, positive ? "green" : "orange"),
    ),
    blank(),
    ...ORNAMENTAL_DIVIDER,
    blank(),
  ];
}

export function buildEventAnnouncement(event: { name: string; description: string; type: string }): TerminalLine[] {
  const lines: TerminalLine[] = [];

  // Pick art based on event type/name
  if (event.name.toLowerCase().includes("crash")) {
    lines.push(...MARKET_CRASH_ART);
    lines.push(indented(2, span("\"The market trembles. Hold onto your ledgers.\"", "gold")));
  } else if (event.name.toLowerCase().includes("rival") || event.name.toLowerCase().includes("crimson")) {
    lines.push(...RIVAL_ARRIVES_ART);
    lines.push(indented(2, span("\"Competition has arrived. The bazaar just got interesting.\"", "gold")));
  } else if (event.name.toLowerCase().includes("festival")) {
    lines.push(...FESTIVAL_ART);
    lines.push(indented(2, span("\"The banners are up! The criers are warmed up! Festival time!\"", "gold")));
  } else if (event.name.toLowerCase().includes("championship")) {
    lines.push(...ORNAMENTAL_DIVIDER);
    lines.push(blank());
    lines.push(line(span("  THE GRAND BAZAAR CHAMPIONSHIP", "gold", true)));
    lines.push(line(span("  has been announced.", "amber")));
    lines.push(blank());
    lines.push(indented(2, span("\"This is it. The final test. Reach 80 reputation to claim the crown.\"", "gold")));
  } else {
    // Generic event
    lines.push(...ORNAMENTAL_DIVIDER);
    lines.push(blank());
    lines.push(line(span(`  EVENT: ${event.name}`, "amber", true)));
  }

  lines.push(blank());
  lines.push(indented(4, span(event.description, "white")));
  lines.push(blank());

  return lines;
}

export function buildWinScreen(state: GameState): TerminalLine[] {
  return [
    ...CHAMPIONSHIP_WIN_ART,
    blank(),
    line(span("  \"You did it. Against all odds, against all rivals,", "gold")),
    line(span("   against the Permit Goblins and their endless forms...", "gold")),
    line(span(`   ${state.brandName} has conquered the Grand Bazaar.\"`, "gold")),
    blank(),
    indented(4, span("Final Cash: ", "dim"), span(`${state.cash}¤`, "gold", true)),
    indented(4, span("Final Reputation: ", "dim"), span(`${state.reputation}/100`, "purple", true)),
    indented(4, span("Missions Completed: ", "dim"), span(`${state.completedMissions.length}`, "white")),
    indented(4, span("Days Survived: ", "dim"), span(`${state.day}`, "amber")),
    blank(),
    line(span("  \"I, Hakim, Keeper of the Velvet Ledger, hereby", "gold")),
    line(span("   declare you CHAMPION of the Grand Bazaar.", "gold")),
    line(span("   Now, shall we do it all again?\"", "gold")),
    blank(),
    ...ORNAMENTAL_DIVIDER,
    blank(),
  ];
}

export function buildLoseScreen(state: GameState, reason: string): TerminalLine[] {
  return [
    ...BANKRUPTCY_ART,
    blank(),
    line(span(`  ${reason}`, "red")),
    blank(),
    line(span("  \"Ah, my friend. The bazaar is a cruel teacher.", "gold")),
    line(span("   But every merchant who fell has risen again —", "gold")),
    line(span("   if they had the courage to try.\"", "gold")),
    blank(),
    indented(4, span("Final Cash: ", "dim"), span(`${state.cash}¤`, "red")),
    indented(4, span("Final Reputation: ", "dim"), span(`${state.reputation}/100`, "dim")),
    indented(4, span("Days Survived: ", "dim"), span(`${state.day}`, "amber")),
    blank(),
    line(span("  \"The ledger remembers all who pass through.", "gold")),
    line(span("   Come back when you are ready.\"", "gold")),
    blank(),
    ...THIN_DIVIDER,
    blank(),
  ];
}

export function buildDawnHeader(day: number, week: number): TerminalLine[] {
  return [
    ...DAWN_ART,
    line(span(`  DAY ${day}`, "amber", true), span(` — Week ${week}`, "dim"), span(` — Morning`, "gold")),
    blank(),
  ];
}

export function buildEveningHeader(day: number): TerminalLine[] {
  return [
    ...EVENING_ART,
    line(span(`  DAY ${day}`, "amber", true), span(` — End of Day Report`, "dim")),
    blank(),
  ];
}

// ===============================================================
// SAVE / RESUME
// ===============================================================

export function buildResumePrompt(summary: { brandName: string; day: number; cash: number; reputation: number; savedAt: string }): TerminalLine[] {
  return [
    blank(),
    ...ORNAMENTAL_DIVIDER,
    blank(),
    line(span("  Hakim brushes dust off an old ledger page.", "dim")),
    blank(),
    line(span("  \"Ah! I recognize this wallet. You have been here before.", "gold")),
    line(span("   The ledger remembers everything.\"", "gold")),
    blank(),
    indented(4, span("Saved Game Found:", "amber", true)),
    indented(4, span("Brand:      ", "dim"), span(summary.brandName, "gold", true)),
    indented(4, span("Day:        ", "dim"), span(`${summary.day}`, "white")),
    indented(4, span("Cash:       ", "dim"), span(`${summary.cash}¤`, "gold")),
    indented(4, span("Reputation: ", "dim"), span(`${summary.reputation}/100`, "purple")),
    indented(4, span("Last saved: ", "dim"), span(summary.savedAt, "dim")),
    blank(),
    line(span("  \"Shall we continue where you left off,", "gold")),
    line(span("   or start fresh with a new venture?\"", "gold")),
    blank(),
  ];
}

export function buildGameSaved(): TerminalLine[] {
  return [
    indented(2, span("Game saved to the cosmic ledger.", "teal")),
  ];
}

export function buildStellarToggleLines(isConnected: boolean, publicKey?: string): TerminalLine[] {
  if (isConnected) {
    return [
      blank(),
      ...THIN_DIVIDER,
      line(span("  STELLAR TESTNET", "teal", true), span(" — Connected", "green")),
      ...THIN_DIVIDER,
      blank(),
      indented(4, span("Wallet: ", "dim"), span(publicKey || "unknown", "teal")),
      indented(4, span("Status: ", "dim"), span("Active — settlements execute on-chain", "green")),
      blank(),
      line(span("  Testnet-ready actions (paid_intel, trade, permits, logistics)", "dim")),
      line(span("  will produce real Stellar transaction receipts.", "dim")),
      blank(),
    ];
  }

  return [
    blank(),
    ...THIN_DIVIDER,
    line(span("  STELLAR TESTNET", "teal", true), span(" — Not Connected", "dim")),
    ...THIN_DIVIDER,
    blank(),
    line(span("  \"Shall we connect to the cosmic ledger?", "gold")),
    line(span("   Real transactions. Real receipts. Play money only.\"", "gold")),
    blank(),
  ];
}
