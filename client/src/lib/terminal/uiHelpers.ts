/**
 * Reusable UI builder helpers for terminal screens.
 *
 * These ensure consistent formatting across both text-mode screens
 * and panel layouts. Avoids duplicating display logic.
 */

import { line, span, blank, indented, title, divider, type TerminalLine } from "./terminalTypes";
import type { TerminalColor } from "./terminalTypes";
import type { Agent, GameState } from "../gameData";
import { getReputationTier, getCashTier } from "../gameEngine";

// ═══════════════════════════════════════════════════════════════
// HAKIM DIALOGUE
// ═══════════════════════════════════════════════════════════════

/** Render a Hakim quote block — consistent formatting everywhere. */
export function hakimSays(text: string): TerminalLine[] {
  // Split long text into ~60-char lines for readability
  const words = text.split(" ");
  const lines: TerminalLine[] = [];
  let current = '  "';
  for (const word of words) {
    if (current.length + word.length + 1 > 64) {
      lines.push(indented(0, span(current, "gold")));
      current = "   " + word;
    } else {
      current += (current.endsWith('"') ? "" : " ") + word;
    }
  }
  current += '"';
  lines.push(indented(0, span(current, "gold")));
  return lines;
}

/** Single-line Hakim quote for tight spaces (panels, etc). */
export function hakimQuote(text: string): string {
  return `"${text}"`;
}

// ═══════════════════════════════════════════════════════════════
// MORNING GREETINGS (single source of truth)
// ═══════════════════════════════════════════════════════════════

/** Get Hakim's morning greeting based on game state. */
export function getHakimGreeting(state: GameState): string {
  if (state.day === 1) {
    return "The sun rises on your first day in the bazaar. Let us see what fortune has in store.";
  }
  if (state.cash < 15) {
    return "We are dangerously close to ruin. Every coin must count today.";
  }
  if (state.cash < 30) {
    return "Dawn again... and our purse is looking rather thin. We must be strategic today.";
  }
  if (state.cash > 300) {
    return "Another glorious morning! With this much gold, even the nobles will take our calls.";
  }
  if (state.reputation > 70) {
    return "The bazaar whispers your name with respect now. Let us not disappoint them.";
  }
  if (state.reputation > 50) {
    return "Our reputation grows. The merchants nod when we pass. A promising sign.";
  }
  if (state.campaign?.rivalBrand && state.reputation < (state.campaign.rivalReputation ?? 0)) {
    return `The Crimson Ledger is outpacing us. Their reputation stands at ${state.campaign.rivalReputation}. We must move faster.`;
  }
  const week = state.campaign?.week ?? 1;
  if (week === 4) {
    return "The final week. The Championship awaits. Every mission counts now.";
  }
  const greetings = [
    "Another day, another opportunity to either profit or panic. I prefer profit.",
    "The spice lanes await! I have checked our ledgers. We are still solvent. Barely.",
    "Good morning! The merchants are stirring, the gossip crows are gossiping. Time to work.",
    "Rise and shine! The market bell has rung. Somewhere, a deal awaits. Or a trap.",
    "The aroma of cinnamon and ambition fills the air. Let us make our mark.",
    "I consulted the stars last night. They said 'try harder.' Helpful as always.",
    "Dawn breaks. The counterparties are sharpening their pencils. So should we.",
    "Another morning in the bazaar. The permit goblins are already queuing. Bad sign.",
  ];
  return greetings[state.day % greetings.length];
}

// ═══════════════════════════════════════════════════════════════
// AGENT CARD — consistent display across all screens
// ═══════════════════════════════════════════════════════════════

/** Get rarity info from an agent's peak stat. */
export function getAgentRarity(agent: Agent): { label: string; color: TerminalColor } {
  const maxStat = Math.max(
    Math.abs(agent.haggleBonus),
    Math.abs(agent.scoutBonus),
    Math.abs(agent.charmBonus),
  );
  if (maxStat >= 27) return { label: "LEGENDARY", color: "purple" };
  if (maxStat >= 22) return { label: "RARE", color: "gold" };
  if (maxStat >= 15) return { label: "UNCOMMON", color: "teal" };
  return { label: "COMMON", color: "dim" };
}

/** Render agent stats consistently: Haggle: +X  Scout: +Y  Charm: +Z */
export function agentStatLine(agent: Agent): TerminalLine {
  return indented(4,
    span("Haggle: ", "dim"),
    span(`${agent.haggleBonus > 0 ? "+" : ""}${agent.haggleBonus}`, agent.haggleBonus > 0 ? "green" : "red"),
    span("  Scout: ", "dim"),
    span(`${agent.scoutBonus > 0 ? "+" : ""}${agent.scoutBonus}`, agent.scoutBonus > 0 ? "green" : "red"),
    span("  Charm: ", "dim"),
    span(`${agent.charmBonus > 0 ? "+" : ""}${agent.charmBonus}`, agent.charmBonus > 0 ? "green" : "red"),
  );
}

/** Render agent meta line: Risk + Fee + Morale */
export function agentMetaLine(agent: Agent): TerminalLine {
  return indented(4,
    span("Risk: ", "dim"),
    span(`${Math.round(agent.riskFactor * 100)}%`, "orange"),
    span("  Fee: ", "dim"),
    span(`${agent.costPerMission}¤`, "gold"),
    span("  Morale: ", "dim"),
    span(`${agent.morale}%`, agent.morale > 50 ? "green" : "orange"),
  );
}

/** Compact agent summary line for lists (choice screens, roster). */
export function agentSummaryLines(agent: Agent, index: number): TerminalLine[] {
  const rarity = getAgentRarity(agent);
  return [
    indented(4,
      span(`[${index + 1}] `, "amber"),
      span(`${agent.emoji} ${agent.name}`, "cyan", true),
      span(` — ${agent.title}`, "dim"),
      rarity.label !== "COMMON" ? span(`  [${rarity.label}]`, rarity.color, true) : span("", "dim"),
    ),
    indented(6,
      span("Haggle: ", "dim"),
      span(`${agent.haggleBonus > 0 ? "+" : ""}${agent.haggleBonus}`, agent.haggleBonus > 0 ? "green" : "red"),
      span("  Scout: ", "dim"),
      span(`${agent.scoutBonus > 0 ? "+" : ""}${agent.scoutBonus}`, agent.scoutBonus > 0 ? "green" : "red"),
      span("  Charm: ", "dim"),
      span(`${agent.charmBonus > 0 ? "+" : ""}${agent.charmBonus}`, agent.charmBonus > 0 ? "green" : "red"),
      span("  Fee: ", "dim"),
      span(`${agent.costPerMission}¤`, "gold"),
      span("  Morale: ", "dim"),
      span(`${agent.morale}%`, agent.morale > 50 ? "green" : "orange"),
    ),
  ];
}

// ═══════════════════════════════════════════════════════════════
// CURRENCY — always show with ¤ suffix
// ═══════════════════════════════════════════════════════════════

/** Format a currency amount consistently: "42¤" */
export function cash(amount: number): string {
  return `${amount}¤`;
}

// ═══════════════════════════════════════════════════════════════
// FINANCIAL SUMMARY — spent/earned/net
// ═══════════════════════════════════════════════════════════════

export function financialSummaryLines(spent: number, earned: number, net: number, repChange?: number): TerminalLine[] {
  const lines: TerminalLine[] = [
    indented(4,
      span("Spent: ", "dim"), span(cash(spent), "red"),
      span("  Earned: ", "dim"), span(cash(earned), "green"),
      span("  Net: ", "dim"), span(`${net >= 0 ? "+" : ""}${net}¤`, net >= 0 ? "green" : "red", true),
    ),
  ];
  if (repChange !== undefined && repChange !== 0) {
    lines.push(indented(4,
      span("Reputation: ", "dim"),
      span(`${repChange > 0 ? "+" : ""}${repChange}`, repChange > 0 ? "purple" : "orange"),
    ));
  }
  return lines;
}

// ═══════════════════════════════════════════════════════════════
// SECTION HEADER — title + divider, consistent everywhere
// ═══════════════════════════════════════════════════════════════

/** Section heading for text-mode screens. */
export function sectionHeader(text: string, color: TerminalColor = "amber"): TerminalLine[] {
  return [
    divider("dim", "dashed"),
    line(span(`  ${text}`, color, true)),
    divider("dim", "dashed"),
    blank(),
  ];
}

// ═══════════════════════════════════════════════════════════════
// TREASURY STATUS — consistent dashboard display
// ═══════════════════════════════════════════════════════════════

export function treasuryLines(state: GameState): TerminalLine[] {
  const rep = getReputationTier(state.reputation);
  const cashTier = getCashTier(state.cash);
  const idleAgents = state.agents.filter(a => a.status === "idle");

  return [
    indented(4,
      span("Treasury: ", "dim"),
      span(`${cashTier.emoji} ${cash(state.cash)}`, "gold", true),
      span(" (", "dim"),
      span(cashTier.name, state.cash > 100 ? "green" : state.cash > 30 ? "amber" : "red"),
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
      span("Missions: ", "dim"),
      span(`${state.completedMissions.length}`, "white"),
      span(" completed", "dim"),
    ),
  ];
}

// ═══════════════════════════════════════════════════════════════
// MORNING BRIEF CHOICES — single source of truth
// ═══════════════════════════════════════════════════════════════

import type { TerminalChoice } from "./terminalTypes";

export function morningBriefChoices(state: GameState): TerminalChoice[] {
  const choices: TerminalChoice[] = [
    { key: "1", label: "Begin planning missions", action: "PLAN" },
    { key: "a", label: "View agents & quests", action: "VIEW_AGENTS" },
    { key: "s", label: "Hakim's Emporium (shop)", action: "VIEW_SHOP" },
    { key: "n", label: "View market network", action: "VIEW_NETWORK" },
    { key: "l", label: "View receipt ledger", action: "VIEW_LEDGER" },
    { key: "r", label: "View rumors", action: "VIEW_RUMORS" },
    { key: "x", label: "Agent NFTs (SEP-50)", action: "VIEW_NFTS" },
  ];

  if (state.campaign?.rivalBrand) {
    choices.push({
      key: "v",
      label: `Rival: ${state.campaign.rivalBrand} (Rep: ${state.campaign.rivalReputation})`,
      action: "VIEW_AGENTS",
      disabled: true,
    });
  }

  return choices;
}

// ═══════════════════════════════════════════════════════════════
// HAKIM DAILY REPORT COMMENT
// ═══════════════════════════════════════════════════════════════

export function hakimDailyComment(netChange: number): string {
  if (netChange > 20) return "A magnificent day! The ledger practically glows.";
  if (netChange > 0) return "A profitable day! The ledger smiles upon us.";
  if (netChange === 0) return "We broke even. Not exciting, but not ruinous.";
  return "Losses today. The bazaar giveth and the bazaar taketh. Mostly taketh.";
}
