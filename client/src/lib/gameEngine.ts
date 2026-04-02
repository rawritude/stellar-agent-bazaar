// ═══════════════════════════════════════════════════════════════
// THE VELVET LEDGER BAZAAR — Game Engine
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
  INITIAL_AGENTS,
  INITIAL_DISTRICTS,
  POSITIVE_HEADLINES,
  NEGATIVE_HEADLINES,
  NEUTRAL_HEADLINES,
  POSITIVE_DETAILS,
  NEGATIVE_DETAILS,
  RUMORS,
  SIDE_EFFECTS,
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
    activeMissions: [],
    completedMissions: [],
    rumors: ["Welcome to the bazaar. Rumors say opportunity favors the bold — and the adequately funded."],
    dayPhase: "morning",
    eventLog: [`Day 1 — ${brandName} opens for business. The market awaits.`],
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

function resolveSingleMission(mission: ActiveMission): MissionResult {
  const successChance = calculateSuccessChance(mission);
  const success = roll(successChance);
  const { agent, template, budget, riskPosture, district } = mission;

  // Wild outcome chance (from agent risk factor + posture)
  const wildChance = agent.riskFactor + (riskPosture === "theatrical" ? 0.2 : riskPosture === "reckless" ? 0.15 : 0);
  const isWild = roll(wildChance);

  let moneySpent = budget;
  let moneyEarned = 0;
  let reputationChange = 0;
  let headline = "";
  let details: string[] = [];
  let rumorGained: string | undefined;
  let sideEffect: string | undefined;

  if (success) {
    // Successful mission
    const rewardMultiplier = isWild ? (1.3 + Math.random() * 0.7) : (0.8 + Math.random() * 0.4);
    moneyEarned = Math.round(template.baseReward * rewardMultiplier);

    // Budget efficiency — cautious spends less
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
    // Failed mission
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

  // Rumor generation (always possible on scout/investigation missions, sometimes otherwise)
  if (template.type === "scout" || template.type === "investigation" || roll(0.3)) {
    rumorGained = pick(RUMORS);
    details.push(`Intel gathered: "${rumorGained}"`);
  }

  // Side effects
  if (roll(0.35)) {
    sideEffect = pick(SIDE_EFFECTS);
    details.push(`Side effect: ${sideEffect}`);
  }

  return {
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
      },
    };
  }

  // Resolve all active missions
  const resolved = state.activeMissions.map(mission => ({
    ...mission,
    status: "completed" as const,
    result: resolveSingleMission(mission),
  }));

  // Aggregate results
  let totalEarned = 0;
  let totalSpent = 0;
  let totalRepChange = 0;
  const headlines: string[] = [];
  const newRumors: string[] = [];
  const newLogs: string[] = [];

  resolved.forEach(m => {
    const r = m.result!;
    totalEarned += r.moneyEarned;
    totalSpent += r.moneySpent;
    totalRepChange += r.reputationChange;
    headlines.push(`${m.agent.emoji} ${m.agent.name}: ${r.headline}`);
    if (r.rumorGained) newRumors.push(r.rumorGained);
    newLogs.push(`Day ${state.day} — ${m.agent.name} returned from ${m.district.name}: ${r.headline}`);
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

  return {
    ...state,
    cash: state.cash + totalEarned,
    reputation: clamp(state.reputation + totalRepChange, 0, 100),
    agents: updatedAgents,
    activeMissions: [],
    completedMissions: [...state.completedMissions, ...resolved],
    rumors: [...new Set([...state.rumors, ...newRumors])].slice(-15),
    dayPhase: "reports",
    eventLog: [...state.eventLog, ...newLogs],
    dailyReport: {
      day: state.day,
      missionsRun: resolved.length,
      totalSpent,
      totalEarned,
      netChange,
      reputationChange: totalRepChange,
      headlines,
      rumors: newRumors,
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

  return {
    ...state,
    day: state.day + 1,
    dayPhase: "morning",
    dailyReport: undefined,
    rumors: newRumors,
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
