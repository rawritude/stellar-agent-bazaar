// ═══════════════════════════════════════════════════════════════
// THE VELVET LEDGER BAZAAR — Game Engine
// Two-sided resolution: agents negotiate with counterparties.
// Pure functions for mission resolution, day progression, etc.
// ═══════════════════════════════════════════════════════════════

import {
  type GameState,
  type ActiveMission,
  type MissionResult,
  type MissionTemplate,
  type Agent,
  type District,
  type DailyReport,
  type RiskPosture,
  type Counterparty,
  type ActionStep,
  type ActionType,
  type NetworkStats,
  INITIAL_AGENTS,
  INITIAL_DISTRICTS,
  INITIAL_COUNTERPARTIES,
  POSITIVE_HEADLINES,
  NEGATIVE_HEADLINES,
  NEUTRAL_HEADLINES,
  POSITIVE_DETAILS,
  NEGATIVE_DETAILS,
  RUMORS,
  SIDE_EFFECTS,
  COUNTERPARTY_SUCCESS_LINES,
  COUNTERPARTY_FAILURE_LINES,
} from "./gameData";

// ── Helpers ──────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roll(chance: number): boolean {
  return Math.random() < chance;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Initial State ────────────────────────────────────────────

export function createInitialState(brandName: string = "The Velvet Ledger"): GameState {
  return {
    day: 1,
    cash: 100,
    reputation: 25,
    brandName,
    agents: INITIAL_AGENTS.map(a => ({ ...a })),
    districts: INITIAL_DISTRICTS.map(d => ({
      ...d,
      availableMissions: d.availableMissions.map(m => ({ ...m })),
      rumors: [...d.rumors],
    })),
    counterparties: INITIAL_COUNTERPARTIES.map(c => ({ ...c })),
    activeMissions: [],
    completedMissions: [],
    rumors: ["Welcome to the bazaar. Rumors say opportunity favors the bold — and the adequately funded."],
    dayPhase: "morning",
    eventLog: [`Day 1 — ${brandName} opens for business. The market network awaits.`],
    networkStats: {
      totalTransactions: 0,
      simulatedTransactions: 0,
      testnetTransactions: 0,
      counterpartiesUsed: 0,
    },
  };
}

// ── Mission Dispatch ─────────────────────────────────────────

export function canAffordMission(state: GameState, template: MissionTemplate, budget: number, agent: Agent): boolean {
  const totalCost = budget + agent.costPerMission;
  return state.cash >= totalCost;
}

export function dispatchMission(
  state: GameState,
  template: MissionTemplate,
  agentId: string,
  districtId: string,
  budget: number,
  riskPosture: RiskPosture
): GameState {
  const agent = state.agents.find(a => a.id === agentId);
  const district = state.districts.find(d => d.id === districtId);
  if (!agent || !district) return state;
  if (agent.status !== "idle") return state;

  const totalCost = budget + agent.costPerMission;
  if (state.cash < totalCost) return state;

  const mission: ActiveMission = {
    id: generateId(),
    template,
    agent: { ...agent },
    district: { ...district },
    budget,
    riskPosture,
    status: "in_progress",
  };

  return {
    ...state,
    cash: state.cash - totalCost,
    agents: state.agents.map(a =>
      a.id === agentId ? { ...a, status: "deployed" as const } : a
    ),
    activeMissions: [...state.activeMissions, mission],
    eventLog: [
      ...state.eventLog,
      `Day ${state.day} — ${agent.name} dispatched to ${district.name} for "${template.name}" (Budget: ${budget}¤, Posture: ${riskPosture})`,
    ],
  };
}

// ── Counterparty Resolution ──────────────────────────────────
// Find the best counterparty for a given action in a given district

function findCounterparty(
  counterparties: Counterparty[],
  action: ActionType,
  districtId: string,
): Counterparty | undefined {
  // Find counterparties that support this action AND operate in this district
  const candidates = counterparties.filter(
    c => c.supportedActions.includes(action) && c.districtIds.includes(districtId)
  );
  if (candidates.length === 0) {
    // Fallback: any counterparty that supports this action
    const fallback = counterparties.filter(c => c.supportedActions.includes(action));
    return fallback.length > 0 ? pick(fallback) : undefined;
  }
  // Pick randomly among candidates (weighted by reliability could be future enhancement)
  return pick(candidates);
}

// Resolve a single action step through a counterparty
function resolveActionStep(
  action: ActionType,
  counterparty: Counterparty,
  agent: Agent,
  budgetPerStep: number,
  riskPosture: RiskPosture,
): ActionStep {
  // Base success from counterparty reliability
  let stepChance = counterparty.reliability;

  // Agent bonus based on action type
  if (action === "trade_execution" || action === "negotiation") {
    stepChance += agent.haggleBonus / 200;
  } else if (action === "paid_intel" || action === "inspection") {
    stepChance += agent.scoutBonus / 200;
  } else if (action === "brand_promotion" || action === "sabotage_op") {
    stepChance += agent.charmBonus / 200;
  }

  // Counterparty mood modifier
  const moodMod = { cooperative: 0.05, neutral: 0, hostile: -0.1, chaotic: (Math.random() - 0.5) * 0.2 };
  stepChance += moodMod[counterparty.mood];

  // Posture modifier
  const postureMod: Record<RiskPosture, number> = {
    cautious: -0.05,
    balanced: 0,
    reckless: 0.1,
    theatrical: 0.05,
  };
  stepChance += postureMod[riskPosture];

  stepChance = clamp(stepChance, 0.15, 0.95);
  const success = roll(stepChance);

  // Cost: counterparty greed factor affects how much they charge
  const greedMultiplier = 1 + counterparty.greedFactor * 0.5;
  const cost = Math.round(budgetPerStep * greedMultiplier * (success ? 0.8 : 1.0));

  // Description from templates
  const lines = success
    ? COUNTERPARTY_SUCCESS_LINES[counterparty.type]
    : COUNTERPARTY_FAILURE_LINES[counterparty.type];
  const description = lines ? pick(lines) : (success ? "Transaction completed." : "Transaction failed.");

  return {
    actionType: action,
    counterpartyId: counterparty.id,
    counterpartyName: counterparty.name,
    counterpartyEmoji: counterparty.emoji,
    description,
    cost,
    settlementMode: counterparty.settlementMode,
    success,
  };
}

// ── Mission Resolution ───────────────────────────────────────

function calculateSuccessChance(
  mission: ActiveMission
): number {
  const { agent, template, budget, riskPosture, district } = mission;

  // Base chance from budget ratio
  let chance = 0.4 + (budget / template.baseBudget) * 0.25;

  // Agent specialty bonus
  if (template.type === "trade" || template.type === "sabotage") {
    chance += agent.haggleBonus / 100;
  } else if (template.type === "scout" || template.type === "investigation") {
    chance += agent.scoutBonus / 100;
  } else if (template.type === "branding" || template.type === "diplomacy") {
    chance += agent.charmBonus / 100;
  }

  // Risk posture modifier
  const postureModifiers: Record<RiskPosture, number> = {
    cautious: -0.10,
    balanced: 0,
    reckless: 0.15,
    theatrical: 0.10,
  };
  chance += postureModifiers[riskPosture];

  // District danger penalty
  chance -= (district.dangerLevel - 2) * 0.05;

  // Mission risk penalty
  chance -= (template.riskLevel - 2) * 0.05;

  // Morale bonus
  chance += (agent.morale - 50) / 500;

  return clamp(chance, 0.1, 0.95);
}

function resolveSingleMission(
  mission: ActiveMission,
  counterparties: Counterparty[],
): { result: MissionResult; updatedCounterparties: Counterparty[] } {
  const successChance = calculateSuccessChance(mission);
  const success = roll(successChance);
  const { agent, template, budget, riskPosture, district } = mission;

  // Wild outcome chance (from agent risk factor + posture)
  const wildChance = agent.riskFactor + (riskPosture === "theatrical" ? 0.2 : riskPosture === "reckless" ? 0.15 : 0);
  const isWild = roll(wildChance);

  // ── Route through counterparties ──
  const actionSequence = template.actionSequence || ["trade_execution"];
  const budgetPerStep = Math.round(budget / actionSequence.length);
  const actionSteps: ActionStep[] = [];
  const usedCounterpartyIds = new Set<string>();
  let primaryCounterpartyName: string | undefined;

  // Make a mutable copy for tracking interaction counts
  const cpMap = new Map(counterparties.map(c => [c.id, { ...c }]));

  for (const action of actionSequence) {
    const cp = findCounterparty(counterparties, action, district.id);
    if (!cp) continue;

    const step = resolveActionStep(action, cp, agent, budgetPerStep, riskPosture);
    actionSteps.push(step);
    usedCounterpartyIds.add(cp.id);

    // Track first counterparty as primary
    if (!primaryCounterpartyName) {
      primaryCounterpartyName = cp.name;
    }

    // Update counterparty interaction count
    const tracked = cpMap.get(cp.id);
    if (tracked) {
      tracked.interactionCount += 1;
    }
  }

  // ── Financial resolution (enhanced by action steps) ──
  const stepSuccessRate = actionSteps.length > 0
    ? actionSteps.filter(s => s.success).length / actionSteps.length
    : 0.5;

  let moneySpent = budget;
  let moneyEarned = 0;
  let reputationChange = 0;
  let headline = "";
  let details: string[] = [];
  let rumorGained: string | undefined;
  let sideEffect: string | undefined;

  if (success) {
    const rewardMultiplier = isWild
      ? (1.3 + Math.random() * 0.7)
      : (0.7 + stepSuccessRate * 0.5);
    moneyEarned = Math.round(template.baseReward * rewardMultiplier);

    const spendRatio = riskPosture === "cautious" ? 0.6 : riskPosture === "balanced" ? 0.8 : 1.0;
    moneySpent = Math.round(budget * spendRatio);

    headline = isWild ? pick(POSITIVE_HEADLINES) : pick(NEUTRAL_HEADLINES);
    reputationChange = Math.round((isWild ? 5 : 2) * district.reputationModifier);

    details.push(pick(POSITIVE_DETAILS));
    if (isWild) {
      details.push(pick(POSITIVE_DETAILS));
      details.push(`${agent.name} exceeded expectations. The market took notice.`);
    }
    details.push(`${agent.name} spent ${moneySpent}¤ of ${budget}¤ budget and returned with ${moneyEarned}¤ in value.`);
  } else {
    const lossMultiplier = isWild ? (0.8 + Math.random() * 0.5) : (0.4 + Math.random() * 0.3);
    moneySpent = Math.round(budget * lossMultiplier);
    moneyEarned = Math.round(template.baseReward * (0.1 + Math.random() * 0.2));

    headline = isWild ? pick(NEGATIVE_HEADLINES) : pick(NEUTRAL_HEADLINES);
    reputationChange = Math.round((isWild ? -4 : -1) * district.reputationModifier);

    details.push(pick(NEGATIVE_DETAILS));
    if (isWild) {
      details.push(pick(NEGATIVE_DETAILS));
      details.push(`${agent.name} had a rough day. The less said, the better.`);
    }
    details.push(`${agent.name} spent ${moneySpent}¤ of ${budget}¤ budget and salvaged ${moneyEarned}¤.`);
  }

  // Add counterparty interaction summary to details
  if (actionSteps.length > 0) {
    const cpNames = [...new Set(actionSteps.map(s => `${s.counterpartyEmoji} ${s.counterpartyName}`))];
    details.push(`Counterparties engaged: ${cpNames.join(", ")}`);

    // Add specific step narratives (most interesting ones)
    const interestingSteps = actionSteps.filter(s => s.success !== success); // show surprising steps
    if (interestingSteps.length > 0) {
      details.push(interestingSteps[0].description);
    } else if (actionSteps.length > 0) {
      details.push(actionSteps[0].description);
    }
  }

  // Rumor generation
  if (template.type === "scout" || template.type === "investigation" || roll(0.3)) {
    rumorGained = pick(RUMORS);
    details.push(`Intel gathered: "${rumorGained}"`);
  }

  // Side effects
  if (roll(0.35)) {
    sideEffect = pick(SIDE_EFFECTS);
    details.push(`Side effect: ${sideEffect}`);
  }

  // Build updated counterparties list
  const updatedCounterparties = counterparties.map(c => {
    const updated = cpMap.get(c.id);
    return updated || c;
  });

  return {
    result: {
      success,
      moneySpent,
      moneyEarned,
      netProfit: moneyEarned - moneySpent,
      reputationChange,
      narrative: headline,
      headline,
      details,
      rumorGained,
      sideEffect,
      actionSteps,
      primaryCounterparty: primaryCounterpartyName,
      settlementSummary: "simulated",
    },
    updatedCounterparties,
  };
}

// ── Day Resolution ───────────────────────────────────────────

export function resolveDay(state: GameState): GameState {
  if (state.activeMissions.length === 0) {
    return {
      ...state,
      dayPhase: "reports",
      dailyReport: {
        day: state.day,
        missionsRun: 0,
        totalSpent: 0,
        totalEarned: 0,
        netChange: 0,
        reputationChange: 0,
        headlines: ["No missions dispatched. The market waits for nobody."],
        rumors: [],
        counterpartiesEngaged: [],
        actionBreakdown: [],
      },
    };
  }

  // Resolve all active missions, threading counterparty state through
  let currentCounterparties = state.counterparties;
  const resolved: ActiveMission[] = [];

  for (const mission of state.activeMissions) {
    const { result, updatedCounterparties } = resolveSingleMission(mission, currentCounterparties);
    currentCounterparties = updatedCounterparties;
    resolved.push({
      ...mission,
      status: "completed" as const,
      result,
    });
  }

  // Aggregate results
  let totalEarned = 0;
  let totalSpent = 0;
  let totalRepChange = 0;
  const headlines: string[] = [];
  const newRumors: string[] = [];
  const newLogs: string[] = [];
  const allCounterpartiesEngaged = new Set<string>();
  const actionCounts = new Map<ActionType, number>();

  resolved.forEach(m => {
    const r = m.result!;
    totalEarned += r.moneyEarned;
    totalSpent += r.moneySpent;
    totalRepChange += r.reputationChange;
    headlines.push(`${m.agent.emoji} ${m.agent.name}: ${r.headline}`);
    if (r.rumorGained) newRumors.push(r.rumorGained);
    newLogs.push(`Day ${state.day} — ${m.agent.name} returned from ${m.district.name}: ${r.headline}`);

    // Track counterparty usage
    r.actionSteps.forEach(step => {
      allCounterpartiesEngaged.add(step.counterpartyName);
      actionCounts.set(step.actionType, (actionCounts.get(step.actionType) || 0) + 1);
    });
  });

  // Update agent states
  const updatedAgents = state.agents.map(agent => {
    const agentMission = resolved.find(m => m.agent.id === agent.id);
    if (!agentMission) return agent;

    const r = agentMission.result!;
    return {
      ...agent,
      status: "idle" as const,
      missionsCompleted: agent.missionsCompleted + 1,
      morale: clamp(
        agent.morale + (r.success ? 5 : -8) + (r.netProfit > 0 ? 3 : -2),
        10,
        100
      ),
    };
  });

  const netChange = totalEarned - totalSpent;

  // Update network stats
  const totalNewTxns = resolved.reduce((sum, m) => sum + (m.result?.actionSteps.length || 0), 0);
  const allUsedCpIds = new Set<string>();
  resolved.forEach(m => m.result?.actionSteps.forEach(s => allUsedCpIds.add(s.counterpartyId)));

  // Find most-used counterparty
  const cpUsageCounts = new Map<string, number>();
  currentCounterparties.forEach(c => {
    if (c.interactionCount > 0) cpUsageCounts.set(c.name, c.interactionCount);
  });
  let favoriteCounterparty: string | undefined;
  let maxUsage = 0;
  cpUsageCounts.forEach((count, name) => {
    if (count > maxUsage) { maxUsage = count; favoriteCounterparty = name; }
  });

  const networkStats: NetworkStats = {
    totalTransactions: state.networkStats.totalTransactions + totalNewTxns,
    simulatedTransactions: state.networkStats.simulatedTransactions + totalNewTxns,
    testnetTransactions: 0,
    counterpartiesUsed: new Set([
      ...currentCounterparties.filter(c => c.interactionCount > 0).map(c => c.id)
    ]).size,
    favoriteCounterparty,
  };

  // Action breakdown for daily report
  const actionBreakdown = Array.from(actionCounts.entries()).map(([action, count]) => ({
    action,
    count,
  }));

  return {
    ...state,
    cash: state.cash + totalEarned,
    reputation: clamp(state.reputation + totalRepChange, 0, 100),
    agents: updatedAgents,
    counterparties: currentCounterparties,
    activeMissions: [],
    completedMissions: [...state.completedMissions, ...resolved],
    rumors: [...new Set([...state.rumors, ...newRumors])].slice(-15),
    dayPhase: "reports",
    eventLog: [...state.eventLog, ...newLogs],
    networkStats,
    dailyReport: {
      day: state.day,
      missionsRun: resolved.length,
      totalSpent,
      totalEarned,
      netChange,
      reputationChange: totalRepChange,
      headlines,
      rumors: newRumors,
      counterpartiesEngaged: [...allCounterpartiesEngaged],
      actionBreakdown,
    },
  };
}

// ── Advance Day ──────────────────────────────────────────────

export function advanceDay(state: GameState): GameState {
  // Random market event
  const randomRumor = roll(0.4) ? pick(RUMORS) : undefined;
  const newRumors = randomRumor
    ? [...new Set([...state.rumors, randomRumor])].slice(-15)
    : state.rumors;

  // Counterparty mood shifts (random daily variation)
  const moods: Counterparty["mood"][] = ["cooperative", "neutral", "hostile", "chaotic"];
  const updatedCounterparties = state.counterparties.map(c => {
    if (roll(0.15)) {
      // Small chance of mood shift
      const currentIdx = moods.indexOf(c.mood);
      const shift = roll(0.5) ? 1 : -1;
      const newIdx = clamp(currentIdx + shift, 0, moods.length - 1);
      return { ...c, mood: moods[newIdx] };
    }
    return c;
  });

  return {
    ...state,
    day: state.day + 1,
    dayPhase: "morning",
    dailyReport: undefined,
    rumors: newRumors,
    counterparties: updatedCounterparties,
    eventLog: [
      ...state.eventLog,
      `═══ Day ${state.day + 1} begins ═══`,
      ...(randomRumor ? [`New rumor: "${randomRumor}"`] : []),
    ],
  };
}

export function startPlanning(state: GameState): GameState {
  return { ...state, dayPhase: "planning" };
}

export function getReputationTier(reputation: number): { name: string; emoji: string; color: string } {
  if (reputation >= 80) return { name: "Legendary", emoji: "👑", color: "text-yellow-500" };
  if (reputation >= 60) return { name: "Respected", emoji: "⭐", color: "text-blue-500" };
  if (reputation >= 40) return { name: "Known", emoji: "📍", color: "text-green-500" };
  if (reputation >= 20) return { name: "Scrappy", emoji: "🔧", color: "text-orange-500" };
  return { name: "Unknown", emoji: "❓", color: "text-muted-foreground" };
}

export function getCashTier(cash: number): { name: string; emoji: string } {
  if (cash >= 500) return { name: "Wealthy", emoji: "💰" };
  if (cash >= 200) return { name: "Comfortable", emoji: "💵" };
  if (cash >= 50) return { name: "Scraping By", emoji: "🪙" };
  return { name: "Broke", emoji: "😰" };
}

// ── Counterparty helpers for UI ──────────────────────────────

export function getCounterpartiesForDistrict(
  counterparties: Counterparty[],
  districtId: string,
): Counterparty[] {
  return counterparties.filter(c => c.districtIds.includes(districtId));
}

export function getCounterpartiesForAction(
  counterparties: Counterparty[],
  action: ActionType,
  districtId?: string,
): Counterparty[] {
  return counterparties.filter(c =>
    c.supportedActions.includes(action) &&
    (!districtId || c.districtIds.includes(districtId))
  );
}
