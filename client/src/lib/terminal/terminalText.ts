import { line, span, blank, indented, title, divider, figletBlock, type TerminalLine, type TerminalChoice } from "./terminalTypes";
import type { GameState, Agent, District, MissionTemplate, ActiveMission, Counterparty, ActionStep } from "../gameData";
import { ACTION_TYPE_INFO } from "../gameData";
import { getReputationTier, getCashTier } from "../gameEngine";
import {
  renderBazaarEntrance, renderDjinn, renderTrophy, renderLedger,
  renderChest, renderMarketplace, renderCaravan, renderSpyScene,
  renderFestival, renderCrash, renderHandshake, renderRival,
  renderMerchant, renderDesertSunrise, renderMoonlitNight,
  renderCoinPile, renderBrokenCoin, renderScroll, renderKey,
  renderCrown, renderDagger, renderStorm, renderFlames,
  renderScales, renderShield, renderHourglass, renderCompass,
  renderAlley, renderDice, renderPotion, renderTreasureMap,
  renderTaxCollector,
} from "./brailleArt";
import {
  getHakimGreeting, getAgentRarity, agentStatLine, agentMetaLine,
  agentSummaryLines, cash, financialSummaryLines, sectionHeader,
  treasuryLines, hakimDailyComment,
} from "./uiHelpers";

// ===============================================================
// ART HELPERS
// ===============================================================

/** Center all lines in an array (for braille art paired with CSS titles). */
function centered(lines: TerminalLine[]): TerminalLine[] {
  return lines.map(l => ({ ...l, centered: true }));
}

// ===============================================================
// SCENE ART
// ===============================================================

export const SPLASH_ART: TerminalLine[] = [
  blank(),
  ...renderBazaarEntrance(),
  blank(),
  title("The Velvet Ledger", "gold", "2.4em", true),
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
  ...centered(renderDjinn()),
  blank(),
  title("Hakim", "gold", "1.6em", true),
  title("the Ledger-Keeper", "amber", "1em", false),
  blank(),
  { spans: [{ text: "Keeper of Receipts. Counter of Coins.", color: "dim" as const }], centered: true },
  { spans: [{ text: "Witness to Every Deal in the Bazaar.", color: "dim" as const }], centered: true },
];

// Agent art is now always rendered via SPECIALTY_ART (braille-based).
// The old hardcoded AGENT_ART for default agents was removed since
// the game now always generates agents via AI.

const DISTRICT_ART: Record<string, TerminalLine[]> = {
  "velvet-steps": [
    ...centered(renderMarketplace()),
    title("The Velvet Steps", "gold", "1.1em", true),
    { spans: [{ text: "Marble colonnades. Silk awnings. Merchants who judge your embossing.", color: "dim" as const }], centered: true },
  ],
  "fungal-quarter": [
    ...centered(renderAlley()),
    title("The Fungal Quarter", "green", "1.1em", true),
    { spans: [{ text: "Damp. Aromatic. Deeply suspicious. Rare spices. Dubious permits.", color: "dim" as const }], centered: true },
  ],
  "festival-sprawl": [
    ...centered(renderFestival()),
    title("Festival Sprawl", "orange", "1.1em", true),
    { spans: [{ text: "Permanent carnival chaos. Pop-up stalls. Brand battles.", color: "dim" as const }], centered: true },
  ],
};

const SUCCESS_ART: TerminalLine[] = [
  ...centered(renderHandshake()),
  title("Mission Success", "green", "1.2em", true),
];

const FAILURE_ART: TerminalLine[] = [
  ...centered(renderBrokenCoin()),
  title("Mission Failed", "red", "1.2em", true),
];

const RESOLVING_ART: TerminalLine[] = [
  blank(),
  ...centered(renderCaravan()),
  blank(),
  title("Settling Transactions", "amber", "1.1em", true),
  blank(),
];

// -- SETUP / ONBOARDING ART ----------------------------------

const WALLET_ART: TerminalLine[] = [
  blank(),
  ...centered(renderLedger()),
  blank(),
  title("The Cosmic Ledger", "teal", "1.4em", true),
  blank(),
  { spans: [{ text: "Where every transaction is written among the stars.", color: "dim" as const }], centered: true },
  blank(),
];

const BRAND_NAMING_ART: TerminalLine[] = [
  blank(),
  ...centered(renderScroll()),
  blank(),
  title("The Ledger Awaits Your Mark", "amber", "1.1em", true),
  blank(),
];

const CREW_ASSEMBLING_ART: TerminalLine[] = [
  blank(),
  ...centered(renderCompass()),
  blank(),
  title("Assembling Your Crew", "amber", "1.1em", true),
  { spans: [{ text: "Agents are being summoned.", color: "dim" as const }], centered: true },
  blank(),
];

// -- WIN / LOSE / EVENT ART ----------------------------------

export const CHAMPIONSHIP_WIN_ART: TerminalLine[] = [
  blank(),
  ...centered(renderTrophy()),
  blank(),
  title("Grand Bazaar Champion", "gold", "1.8em", true),
  blank(),
];

export const BANKRUPTCY_ART: TerminalLine[] = [
  blank(),
  ...centered(renderCrash()),
  blank(),
  title("Bankrupt", "red", "1.6em", true),
  blank(),
];

export const MARKET_CRASH_ART: TerminalLine[] = [
  blank(),
  ...centered(renderStorm()),
  title("Market Crash", "red", "1.2em", true),
  blank(),
];

export const RIVAL_ARRIVES_ART: TerminalLine[] = [
  blank(),
  ...centered(renderRival()),
  title("The Crimson Ledger", "purple", "1.2em", true),
  { spans: [{ text: "has arrived.", color: "dim" as const }], centered: true },
  blank(),
];

export const FESTIVAL_ART: TerminalLine[] = [
  blank(),
  ...centered(renderFestival()),
  title("Festival Week", "orange", "1.2em", true),
  blank(),
];

export const DAWN_ART: TerminalLine[] = [
  ...centered(renderDesertSunrise()),
];

export const EVENING_ART: TerminalLine[] = [
  ...centered(renderMoonlitNight()),
];

export const DOOR_SLAMMED_ART: TerminalLine[] = [
  divider("red"),
  line(span("    ✗ REFUSED ✗", "red", true)),
  divider("red"),
];

export const HANDSHAKE_ART: TerminalLine[] = [
  divider("green"),
  line(span("    ★ TRUSTED PARTNER ★", "green", true)),
  divider("green"),
];

export const WEEKLY_REPORT_ART: TerminalLine[] = [
  blank(),
  title("Weekly Ledger", "amber", "1.2em", true),
  blank(),
];

// -- AGENT SPECIALTY PORTRAITS (for AI-generated agents) -----

export const SPECIALTY_ART: Record<string, TerminalLine[]> = {
  trade: [
    ...centered(renderCoinPile()),
    { spans: [{ text: "Trader", color: "gold" as const, bold: true }], centered: true },
    blank(),
  ],
  scout: [
    ...centered(renderCompass()),
    { spans: [{ text: "Scout", color: "teal" as const, bold: true }], centered: true },
    blank(),
  ],
  investigation: [
    ...centered(renderKey()),
    { spans: [{ text: "Investigator", color: "purple" as const, bold: true }], centered: true },
    blank(),
  ],
  branding: [
    ...centered(renderCrown()),
    { spans: [{ text: "Promoter", color: "orange" as const, bold: true }], centered: true },
    blank(),
  ],
  diplomacy: [
    ...centered(renderScales()),
    { spans: [{ text: "Diplomat", color: "green" as const, bold: true }], centered: true },
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
  const rarity = getAgentRarity(agent);
  const specialtyPortrait = SPECIALTY_ART[agent.specialty] || SPECIALTY_ART.trade;

  const lines: TerminalLine[] = [
    ...THIN_DIVIDER,
    line(span(`  Agent ${idx + 1} of ${total}`, "dim")),
    blank(),
    ...specialtyPortrait!,
    blank(),
    line(
      span(`    ${agent.emoji} `, "white"),
      span(agent.name, "cyan", true),
      rarity.label !== "COMMON"
        ? span(`  [${rarity.label}]`, rarity.color, true)
        : span("", "dim"),
    ),
    line(span(`      ${agent.title}`, "dim")),
  ];

  lines.push(blank());

  if (agent.description) {
    lines.push(indented(4, span(`"${agent.description}"`, "dim")));
    lines.push(blank());
  }

  if (agent.quirk) {
    lines.push(indented(4, span("Quirk: ", "orange"), span(agent.quirk, "dim")));
    lines.push(blank());
  }

  lines.push(agentStatLine(agent));
  lines.push(agentMetaLine(agent));
  lines.push(blank());

  // Hakim's commentary based on specialty
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

  lines.push(blank());
  return lines;
}

export function hakimMorningBrief(state: GameState): TerminalLine[] {
  const week = state.campaign?.week ?? 1;
  const greeting = getHakimGreeting(state);

  const lines: TerminalLine[] = [
    ...buildDawnHeader(state.day, week),
    indented(2, span(`"${greeting}"`, "gold")),
    blank(),
    ...THIN_DIVIDER,
    blank(),
    ...treasuryLines(state),
    blank(),
  ];

  // Latest rumor
  if (state.rumors.length > 0) {
    const latestRumor = state.rumors[state.rumors.length - 1];
    lines.push(indented(4, span("Latest rumor: ", "orange"), span(`"${latestRumor}"`, "dim")));
    lines.push(blank());
  }

  // Rival brand (appears week 2+)
  if (state.campaign?.rivalBrand) {
    lines.push(...buildRivalLines(state));
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
      lines.push(...agentSummaryLines(a, i));
      lines.push(blank());

      choices.push({
        key: `${i + 1}`,
        label: `${a.emoji} ${a.name} (${a.costPerMission}¤ fee)`,
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
    indented(4, span("Available: ", "dim"), span(cash(state.cash), "gold"), span(" (-", "dim"), span(cash(agent.costPerMission), "orange"), span(` agent fee = `, "dim"), span(cash(maxAffordable), "gold"), span(" max budget)", "dim")),
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
    ...sectionHeader("MISSION DISPATCH SUMMARY"),
    indented(4, span("Agent:    ", "dim"), span(`${agent.emoji} ${agent.name}`, "cyan", true)),
    indented(4, span("District: ", "dim"), span(`${district.emoji} ${district.name}`, "gold")),
    indented(4, span("Mission:  ", "dim"), span(mission.name, "white", true)),
    indented(4, span("Budget:   ", "dim"), span(cash(budget), "gold")),
    indented(4, span("Fee:      ", "dim"), span(cash(agent.costPerMission), "orange")),
    indented(4, span("Total:    ", "dim"), span(cash(totalCost), "gold", true)),
    indented(4, span("Posture:  ", "dim"), span(posture, posture === "theatrical" ? "purple" : posture === "reckless" ? "red" : "white")),
    blank(),
    line(span(`  "Shall we dispatch ${agent.name}? Total cost: ${cash(totalCost)} from our ${cash(state.cash)} treasury."`, "gold")),
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
    ...sectionHeader(`Dispatched today: ${active.length} mission${active.length !== 1 ? "s" : ""}`),
  ];

  active.forEach(m => {
    lines.push(indented(4,
      span(`${m.agent.emoji} ${m.agent.name}`, "cyan"),
      span(" -> ", "dim"),
      span(`${m.district.emoji} ${m.template.name}`, "gold"),
      span(` (${cash(m.budget)} + ${cash(m.agent.costPerMission)} fee, ${m.riskPosture})`, "dim"),
    ));
  });

  lines.push(blank());

  if (idle.length > 0 && state.cash > 10) {
    lines.push(line(span(`  ${idle.length} agent${idle.length !== 1 ? "s" : ""} idle, ${cash(state.cash)} in treasury.`, "dim")));
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
        const isReal = step.receipt.settlementMode === "testnet";
        lines.push(blank());
        lines.push(indented(6, span(isReal ? "MPP Protocol Exchange:" : "x402/MPP Protocol:", "teal", true)));
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
        span(`Cost: ${cash(step.cost)}`, "gold"),
        span(` | Settlement: ${step.settlementMode}`, "teal"),
        step.receipt?.receiptId ? span(` | Receipt: ${step.receipt.receiptId}`, "dim") : span("", "dim"),
      ));
      if (step.stellarTxId) {
        const explorerLink = step.receipt?.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${step.stellarTxId}`;
        lines.push(indented(6, span(`Stellar TX: ${step.stellarTxId.slice(0, 24)}...`, "teal")));
        lines.push(indented(6, span(`Explorer:   ${explorerLink}`, "teal")));
      }
      lines.push(blank());
    });
  }

  // Financials
  lines.push(line(span("  Financial Summary:", "amber")));
  lines.push(...financialSummaryLines(r.moneySpent, r.moneyEarned, r.netProfit, r.reputationChange));

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
      span("  Earned: ", "dim"), span(cash(report.totalEarned), "green"),
      span("  Spent: ", "dim"), span(cash(report.totalSpent), "red"),
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
  lines.push(indented(2, span(`"${hakimDailyComment(report.netChange)}"`, "gold")));

  if (report.rumors.length > 0) {
    lines.push(blank());
    lines.push(line(span("  Intel gathered:", "orange")));
    report.rumors.forEach(r => {
      lines.push(indented(4, span(`"${r}"`, "dim")));
    });
  }

  lines.push(blank());
  lines.push(indented(2, span(`Treasury: ${cash(state.cash)}  |  Reputation: ${state.reputation}/100`, "amber")));
  lines.push(blank());

  return lines;
}

// Side views
export function buildAgentRosterView(state: GameState): TerminalLine[] {
  const lines: TerminalLine[] = [
    blank(),
    ...sectionHeader("AGENT ROSTER"),
  ];

  state.agents.forEach((a, i) => {
    const rarity = getAgentRarity(a);
    lines.push(indented(4,
      span(`${a.emoji} ${a.name}`, "cyan", true),
      span(` — ${a.title}`, "dim"),
      rarity.label !== "COMMON" ? span(`  [${rarity.label}]`, rarity.color, true) : span("", "dim"),
    ));
    lines.push(agentStatLine(a));
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
    ...sectionHeader("MARKET NETWORK"),
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
    ...sectionHeader("RECEIPT LEDGER"),
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
        span(` ${cash(step.cost)}`, "gold"),
        span(` ${step.settlementMode}`, step.settlementMode === "testnet" ? "teal" : "dim"),
      ));
      if (r) {
        lines.push(indented(6, span(r.receiptId, "dim")));
        if (r.stellarTxId) {
          const explorerLink = r.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${r.stellarTxId}`;
          lines.push(indented(6, span(`TX: ${r.stellarTxId.slice(0, 32)}...`, "teal")));
          lines.push(indented(6, span(explorerLink, "teal")));
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
    ...sectionHeader("RUMOR FEED"),
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
  ...centered(renderLedger()),
  blank(),
  title("Stellar Network", "teal", "1.4em", true),
  blank(),
  { spans: [{ text: "A cosmic ledger written in starlight.", color: "dim" as const }], centered: true },
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
    ...sectionHeader("AGENT NFTs — SEP-50"),
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
    txHash ? indented(4, span("TX:    ", "dim"), span(txHash.slice(0, 32) + "...", "teal")) : blank(),
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
    ...centered(renderMerchant()),
    title("Merchant Encounter", "gold", "1.1em", true),
  ],
  stranger: [
    ...centered(renderHourglass()),
    title("Mysterious Stranger", "purple", "1.1em", true),
  ],
  disaster: [
    ...centered(renderFlames()),
    title("Market Disruption", "red", "1.1em", true),
  ],
  celebration: [
    ...centered(renderFestival()),
    title("Celebration", "orange", "1.1em", true),
  ],
  agent: [
    ...centered(renderShield()),
    title("Agent Event", "cyan", "1.1em", true),
  ],
  mystery: [
    ...centered(renderKey()),
    title("Mystery", "purple", "1.1em", true),
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
  const name = event.name.toLowerCase();

  // Pick art based on event type/name
  if (name.includes("crash")) {
    lines.push(...MARKET_CRASH_ART);
    lines.push(indented(2, span("\"The market trembles. Hold onto your ledgers.\"", "gold")));
  } else if (name.includes("rival") || name.includes("crimson")) {
    lines.push(...RIVAL_ARRIVES_ART);
    lines.push(indented(2, span("\"Competition has arrived. The bazaar just got interesting.\"", "gold")));
  } else if (name.includes("festival")) {
    lines.push(...FESTIVAL_ART);
    lines.push(indented(2, span("\"The banners are up! The criers are warmed up! Festival time!\"", "gold")));
  } else if (name.includes("championship")) {
    lines.push(blank());
    lines.push(...centered(renderTrophy()));
    lines.push(title("Grand Bazaar Championship", "gold", "1.4em", true));
    lines.push(blank());
    lines.push(indented(2, span("\"This is it. The final test. Reach 80 reputation to claim the crown.\"", "gold")));
  } else if (name.includes("tax") || name.includes("permit") || name.includes("audit")) {
    lines.push(blank());
    lines.push(...centered(renderTaxCollector()));
    lines.push(title(event.name, "orange", "1.1em", true));
  } else if (name.includes("treasure") || name.includes("discover")) {
    lines.push(blank());
    lines.push(...centered(renderTreasureMap()));
    lines.push(title(event.name, "gold", "1.1em", true));
  } else if (name.includes("gambl") || name.includes("wager") || name.includes("luck")) {
    lines.push(blank());
    lines.push(...centered(renderDice()));
    lines.push(title(event.name, "amber", "1.1em", true));
  } else if (name.includes("potion") || name.includes("elixir") || name.includes("brew")) {
    lines.push(blank());
    lines.push(...centered(renderPotion()));
    lines.push(title(event.name, "green", "1.1em", true));
  } else if (name.includes("spy") || name.includes("espionage") || name.includes("shadow")) {
    lines.push(blank());
    lines.push(...centered(renderSpyScene()));
    lines.push(title(event.name, "purple", "1.1em", true));
  } else {
    // Generic event
    lines.push(...ORNAMENTAL_DIVIDER);
    lines.push(blank());
    lines.push(title(event.name, "amber", "1.1em", true));
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
    indented(4, span("Final Cash: ", "dim"), span(cash(state.cash), "gold", true)),
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
    indented(4, span("Final Cash: ", "dim"), span(cash(state.cash), "red")),
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
    ...centered(renderChest()),
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

// ===============================================================
// SHOP SCREEN
// ===============================================================

export function buildShopScreen(state: GameState): { lines: TerminalLine[]; choices: TerminalChoice[] } {
  const shop = state.campaign?.shop ?? [];
  const lines: TerminalLine[] = [
    blank(),
    ...centered(renderChest()),
    blank(),
    title("Hakim's Emporium", "gold", "1.4em", true),
    blank(),
    indented(2, span("\"Every merchant needs an edge. Browse my wares.\"", "gold")),
    blank(),
    ...sectionHeader("Available Items"),
  ];

  const choices: TerminalChoice[] = [];

  shop.forEach((item, i) => {
    const canBuy = item.available && !item.purchased && state.cash >= item.cost;
    const statusLabel = item.purchased
      ? (item.effect.duration > 0 ? ` (active: ${item.effect.duration}d)` : " (purchased)")
      : !item.available ? " (locked)" : "";

    lines.push(indented(4,
      span(`[${i + 1}] `, "amber"),
      span(item.name, canBuy ? "white" : "dim", canBuy),
      span(` — ${cash(item.cost)}`, canBuy ? "gold" : "dim"),
      span(statusLabel, item.purchased ? "green" : "dim"),
    ));
    lines.push(indented(6, span(item.description, "dim")));
    lines.push(blank());

    if (canBuy) {
      choices.push({
        key: `${i + 1}`,
        label: `Buy ${item.name} (${cash(item.cost)})`,
        action: "BUY_ITEM",
        data: item.id,
      });
    } else {
      choices.push({
        key: `${i + 1}`,
        label: item.name,
        action: "BUY_ITEM",
        data: item.id,
        disabled: true,
        disabledReason: item.purchased ? "purchased" : !item.available ? "higher rep needed" : `need ${cash(item.cost)}`,
      });
    }
  });

  lines.push(indented(2, span(`Treasury: ${cash(state.cash)}`, "amber")));
  lines.push(blank());

  choices.push({ key: "b", label: "Back to morning brief", action: "BACK" });
  return { lines, choices };
}

// ===============================================================
// AGENT QUEST DISPLAY
// ===============================================================

export function buildAgentQuestLines(state: GameState): TerminalLine[] {
  const quests = state.campaign?.agentQuests ?? [];
  if (quests.length === 0) return [];

  const lines: TerminalLine[] = [
    ...sectionHeader("AGENT QUESTS"),
  ];

  quests.forEach(q => {
    const agent = state.agents.find(a => a.id === q.agentId);
    if (!agent) return;

    const progress = Math.min(q.requirement.current, q.requirement.target);
    const barWidth = 15;
    const filled = Math.round((progress / q.requirement.target) * barWidth);
    const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

    lines.push(indented(4,
      span(`${agent.emoji} ${agent.name}`, "cyan", true),
      span(` — ${q.name}`, q.completed ? "green" : "amber"),
      q.completed ? span(" ✓ COMPLETE", "green", true) : span("", "dim"),
    ));
    lines.push(indented(6, span(q.description, "dim")));
    if (!q.completed) {
      lines.push(indented(6,
        span("Progress: ", "dim"),
        span(bar, progress >= q.requirement.target ? "green" : "amber"),
        span(` ${progress}/${q.requirement.target}`, "white"),
      ));
    }
    lines.push(indented(6,
      span("Reward: ", "dim"),
      span(q.reward.description, q.completed ? "green" : "gold"),
    ));
    lines.push(blank());
  });

  return lines;
}

// ===============================================================
// RIVAL PERSONALITY DISPLAY
// ===============================================================

export function buildRivalLines(state: GameState): TerminalLine[] {
  const campaign = state.campaign;
  if (!campaign?.rivalBrand) return [];

  const rival = campaign.rival;
  const lines: TerminalLine[] = [];

  if (rival) {
    lines.push(indented(4,
      span(rival.name, "purple", true),
      span(` — ${rival.title}`, "dim"),
    ));
    lines.push(indented(6, span(`"${rival.catchphrase}"`, "purple")));
    lines.push(indented(6,
      span("Style: ", "dim"),
      span(rival.style, "purple"),
      rival.preferredDistrict ? span(`  Turf: ${rival.preferredDistrict}`, "dim") : span("", "dim"),
    ));
  } else {
    lines.push(indented(4, span(campaign.rivalBrand, "purple", true)));
  }

  lines.push(indented(6,
    span("Reputation: ", "dim"),
    span(`${campaign.rivalReputation}/100`, "purple"),
    span("  Cash: ", "dim"),
    span(`~${cash(campaign.rivalCash)}`, "gold"),
  ));

  const repDiff = state.reputation - campaign.rivalReputation;
  const comparison = repDiff > 10 ? "You're ahead! Keep pushing."
    : repDiff > 0 ? "Neck and neck. Stay sharp."
    : repDiff > -10 ? "They're pulling ahead. Act fast."
    : "They're dominating. Time for drastic measures.";
  lines.push(indented(6, span(comparison, repDiff >= 0 ? "green" : "orange")));
  lines.push(blank());

  return lines;
}
