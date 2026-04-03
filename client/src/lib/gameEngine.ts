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
import { getSettlementAdapter, type SettlementRequest, type SettlementAdapter } from "./settlement";

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
    agents: INITIAL_AGENTS.map(a => ({ ...a, memory: { ...a.memory, opinions: [], refusals: [], personalityShifts: [] } })),
    districts: INITIAL_DISTRICTS.map(d => ({
      ...d,
      availableMissions: d.availableMissions.map(m => ({ ...m })),
      rumors: [...d.rumors],
    })),
    counterparties: INITIAL_COUNTERPARTIES.map(c => ({
      ...c,
      trust: c.trust ?? 0,
      priceModifier: c.priceModifier ?? 0,
      lastInteractionDay: c.lastInteractionDay ?? 0,
      refusesService: c.refusesService ?? false,
    })),
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
    campaign: {
      week: 1,
      totalDays: 30,
      rivalReputation: 0,
      rivalCash: 0,
      milestones: [],
      upkeepPerDay: 8,
      isGameOver: false,
      hasWon: false,
    },
    activeEvents: [],
    pendingDecisions: [],
    triggeredRandomEventIds: [],
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
  agent?: Agent,
): Counterparty | undefined {
  // Find counterparties that support this action AND operate in this district
  let candidates = counterparties.filter(
    c => c.supportedActions.includes(action)
      && c.districtIds.includes(districtId)
      && !c.refusesService // Skip counterparties that refuse service
  );

  // Skip counterparties the agent refuses to work with
  if (agent?.memory?.refusals?.length) {
    candidates = candidates.filter(c => !agent.memory.refusals.includes(c.id));
  }

  if (candidates.length === 0) {
    // Fallback: any counterparty that supports this action (ignoring district + agent prefs)
    const fallback = counterparties.filter(
      c => c.supportedActions.includes(action) && !c.refusesService
    );
    return fallback.length > 0 ? pick(fallback) : undefined;
  }

  // Weight by trust — higher trust = more likely to be picked
  // Simple weighted selection: positive trust counterparties are favored
  if (candidates.length > 1) {
    const weights = candidates.map(c => Math.max(1, 10 + c.trust / 10));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
  }

  return pick(candidates);
}

// Resolve a single action step through a counterparty,
// optionally generating an AI scene, then settling via the adapter.
async function resolveActionStep(
  action: ActionType,
  counterparty: Counterparty,
  agent: Agent,
  budgetPerStep: number,
  riskPosture: RiskPosture,
  missionId: string,
  districtId: string,
  day: number,
  adapter?: SettlementAdapter,
  enableAI: boolean = false,
  brandName: string = "",
): Promise<ActionStep> {
  // Base success from counterparty reliability
  let stepChance = counterparty.reliability;

  // Agent bonus based on action type
  let statName = "haggle";
  let statValue = agent.haggleBonus;
  if (action === "trade_execution" || action === "negotiation") {
    stepChance += agent.haggleBonus / 200;
  } else if (action === "paid_intel" || action === "inspection") {
    stepChance += agent.scoutBonus / 200;
    statName = "scout"; statValue = agent.scoutBonus;
  } else if (action === "brand_promotion" || action === "sabotage_op") {
    stepChance += agent.charmBonus / 200;
    statName = "charm"; statValue = agent.charmBonus;
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

  // AI scene generation — the agent and counterparty "think" about the interaction
  let scene: ActionStep["scene"] = undefined;
  if (enableAI) {
    try {
      const actionInfo = ACTION_TYPE_INFO[action];
      const res = await fetch("/api/ai/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: agent.name,
          agentTitle: agent.title,
          agentDescription: agent.description,
          agentQuirk: agent.quirk,
          agentStatName: statName,
          agentStatValue: statValue,
          counterpartyName: counterparty.name,
          counterpartyType: counterparty.type,
          counterpartyDescription: counterparty.description,
          counterpartyQuirk: counterparty.quirk,
          counterpartyMood: counterparty.mood,
          counterpartyReliability: Math.round(counterparty.reliability * 100),
          counterpartyGreed: Math.round(counterparty.greedFactor * 100),
          actionType: actionInfo.label,
          actionDescription: actionInfo.description,
          districtName: districtId,
          budget: budgetPerStep,
          posture: riskPosture,
          brandName: brandName,
          pastInteractions: counterparty.interactionCount,
        }),
      });
      const data = await res.json();
      if (data.scene) {
        scene = data.scene;
        // AI's outcome modifier adjusts the success chance
        stepChance += scene.outcome_modifier;
      }
    } catch {
      // AI failed silently — proceed with procedural generation
    }
  }

  stepChance = clamp(stepChance, 0.15, 0.95);
  const success = roll(stepChance);

  // Cost: counterparty greed factor affects how much they charge
  const greedMultiplier = 1 + counterparty.greedFactor * 0.5;
  const cost = Math.round(budgetPerStep * greedMultiplier * (success ? 0.8 : 1.0));

  // Description: use AI flavor_detail if available, otherwise canned text
  let description: string;
  if (scene?.flavor_detail) {
    description = scene.flavor_detail;
  } else {
    const lines = success
      ? COUNTERPARTY_SUCCESS_LINES[counterparty.type]
      : COUNTERPARTY_FAILURE_LINES[counterparty.type];
    description = lines ? pick(lines) : (success ? "Transaction completed." : "Transaction failed.");
  }

  // Settle through the adapter to produce a receipt
  const settlementAdapter = adapter ?? getSettlementAdapter(counterparty.settlementMode);
  const settlementReq: SettlementRequest = {
    actionType: action,
    counterpartyId: counterparty.id,
    counterpartyName: counterparty.name,
    amount: cost,
    agentId: agent.id,
    districtId,
    missionId,
    success,
    day,
  };
  const { receipt } = await settlementAdapter.settle(settlementReq);

  return {
    actionType: action,
    counterpartyId: counterparty.id,
    counterpartyName: counterparty.name,
    counterpartyEmoji: counterparty.emoji,
    description,
    cost,
    settlementMode: receipt.settlementMode ?? counterparty.settlementMode,
    success,
    stellarTxId: receipt.stellarTxId,
    receipt,
    scene,
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

  // Risk posture modifier (tuned: cautious less free, reckless less reliable)
  const postureModifiers: Record<RiskPosture, number> = {
    cautious: -0.05,
    balanced: 0,
    reckless: 0.10,
    theatrical: 0.05,
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

async function resolveSingleMission(
  mission: ActiveMission,
  counterparties: Counterparty[],
  day: number = 0,
  adapter?: SettlementAdapter,
  enableAI: boolean = false,
  brandName: string = "",
  activeEvents: ActiveEvent[] = [],
): Promise<{ result: MissionResult; updatedCounterparties: Counterparty[] }> {
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
    const cp = findCounterparty(counterparties, action, district.id, agent);
    if (!cp) continue;

    const step = await resolveActionStep(action, cp, agent, budgetPerStep, riskPosture, mission.id, district.id, day, adapter, enableAI, brandName);
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

  // moneySpent = what the player actually paid (budget + agent fee, already deducted at dispatch)
  const totalDeducted = budget + agent.costPerMission;
  let moneySpent = totalDeducted;
  let moneyEarned = 0;
  let reputationChange = 0;
  let headline = "";
  let details: string[] = [];
  let rumorGained: string | undefined;
  let sideEffect: string | undefined;

  // Apply event modifiers
  let eventRewardMod = 1.0;
  let eventRepMod = 1.0;
  for (const event of activeEvents) {
    for (const effect of event.effects) {
      if (effect.type === "price_modifier" && (!effect.target || effect.target === district.id)) {
        eventRewardMod *= effect.value;
      }
      if (effect.type === "reputation_modifier") {
        eventRepMod *= effect.value;
      }
    }
  }

  if (success) {
    const rewardMultiplier = isWild
      ? (1.3 + Math.random() * 0.7)
      : (0.7 + stepSuccessRate * 0.5);
    moneyEarned = Math.round(template.baseReward * rewardMultiplier * eventRewardMod);

    headline = isWild ? pick(POSITIVE_HEADLINES) : pick(NEUTRAL_HEADLINES);
    reputationChange = Math.round((isWild ? 3 : 1) * district.reputationModifier * eventRepMod);

    details.push(pick(POSITIVE_DETAILS));
    if (isWild) {
      details.push(pick(POSITIVE_DETAILS));
      details.push(`${agent.name} exceeded expectations. The market took notice.`);
    }
    details.push(`${agent.name} cost ${totalDeducted}¤ (${budget}¤ budget + ${agent.costPerMission}¤ fee) and returned ${moneyEarned}¤.`);
  } else {
    // On failure, earn a small consolation amount
    moneyEarned = Math.round(template.baseReward * (0.05 + Math.random() * 0.15));

    headline = isWild ? pick(NEGATIVE_HEADLINES) : pick(NEUTRAL_HEADLINES);
    reputationChange = Math.round((isWild ? -3 : -1) * district.reputationModifier);

    details.push(pick(NEGATIVE_DETAILS));
    if (isWild) {
      details.push(pick(NEGATIVE_DETAILS));
      details.push(`${agent.name} had a rough day. The less said, the better.`);
    }
    details.push(`${agent.name} cost ${totalDeducted}¤ and salvaged only ${moneyEarned}¤.`);
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

export async function resolveDay(state: GameState, adapter?: SettlementAdapter, enableAI: boolean = false): Promise<GameState> {
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
    const { result, updatedCounterparties } = await resolveSingleMission(mission, currentCounterparties, state.day, adapter, enableAI, state.brandName, state.activeEvents || []);
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

  // Update agent states with trust, opinions, and personality drift
  const isWildResults = resolved.map(m => {
    const r = m.result!;
    return r.headline && (
      POSITIVE_HEADLINES.includes(r.headline) || NEGATIVE_HEADLINES.includes(r.headline)
    );
  });

  const updatedAgents = state.agents.map(agent => {
    const missionIdx = resolved.findIndex(m => m.agent.id === agent.id);
    if (missionIdx === -1) return agent;

    const agentMission = resolved[missionIdx];
    const r = agentMission.result!;
    const isWild = isWildResults[missionIdx];

    // Base morale change
    let updatedAgent = {
      ...agent,
      status: "idle" as const,
      missionsCompleted: agent.missionsCompleted + 1,
      morale: clamp(
        agent.morale + (r.success ? 3 : -12) + (r.netProfit > 0 ? 2 : -5),
        10,
        100
      ),
    };

    // Update opinions about counterparties interacted with
    for (const step of r.actionSteps) {
      updatedAgent = updateAgentOpinion(
        updatedAgent,
        step.counterpartyId,
        step.success,
        !!isWild,
        state.day,
      );
    }

    return updatedAgent;
  });

  // Update counterparty trust based on interactions
  for (const mission of resolved) {
    const r = mission.result!;
    for (const step of r.actionSteps) {
      const cpIdx = currentCounterparties.findIndex(c => c.id === step.counterpartyId);
      if (cpIdx >= 0) {
        currentCounterparties[cpIdx] = updateCounterpartyTrust(
          currentCounterparties[cpIdx],
          step.success,
          state.day,
        );
      }
    }
  }

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
  const nextDay = state.day + 1;
  const newLogs: string[] = [`═══ Day ${nextDay} begins ═══`];

  // 1. Apply daily upkeep
  const upkeep = applyDailyUpkeep(state);
  newLogs.push(...upkeep.events);

  // 2. Random rumor
  const randomRumor = roll(0.4) ? pick(RUMORS) : undefined;
  const newRumors = randomRumor
    ? [...new Set([...state.rumors, randomRumor])].slice(-15)
    : state.rumors;
  if (randomRumor) newLogs.push(`New rumor: "${randomRumor}"`);

  // 3. Process rumor-triggered events
  const rumorEvents = processRumorEvents({ ...state, rumors: newRumors });
  rumorEvents.forEach(e => newLogs.push(`EVENT: ${e.name} — ${e.description}`));

  // 4. Check for campaign events
  const campaignEvent = getCampaignEvent(nextDay, state);
  if (campaignEvent) {
    rumorEvents.push(campaignEvent);
    newLogs.push(`CAMPAIGN: ${campaignEvent.name} — ${campaignEvent.description}`);
  }

  // 5. Tick existing events (decrease duration)
  const survivingEvents = tickEvents(state.activeEvents || []);
  const allEvents = [...survivingEvents, ...rumorEvents];

  // 6. Counterparty mood shifts — trust-influenced
  const moods: Counterparty["mood"][] = ["cooperative", "neutral", "hostile", "chaotic"];
  const updatedCounterparties = state.counterparties.map(c => {
    if (roll(0.15)) {
      const currentIdx = moods.indexOf(c.mood);
      // Trust biases mood shifts — high trust tends toward cooperative
      const trustBias = c.trust > 30 ? -1 : c.trust < -30 ? 1 : 0;
      const shift = (roll(0.5) ? 1 : -1) + trustBias;
      const newIdx = clamp(currentIdx + shift, 0, moods.length - 1);
      return { ...c, mood: moods[newIdx] };
    }
    return c;
  });

  // 7. Campaign progression
  const week = getCampaignWeek(nextDay);
  const defaultCampaign = { week: 1 as CampaignWeek, totalDays: 30, rivalReputation: 0, rivalCash: 0, milestones: [], upkeepPerDay: 8, isGameOver: false, hasWon: false };
  const campaign = {
    ...defaultCampaign,
    ...state.campaign,
    week,
    upkeepPerDay: 8 + (week - 1) * 2,
  };

  // Add rival in week 2
  if (week >= 2 && !campaign.rivalBrand) {
    campaign.rivalBrand = "The Crimson Ledger";
    campaign.rivalReputation = 20;
    campaign.rivalCash = 150;
  }

  // Rival grows each day
  if (campaign.rivalBrand) {
    campaign.rivalReputation = clamp(campaign.rivalReputation + (roll(0.6) ? 2 : 1), 0, 100);
    campaign.rivalCash += Math.round(5 + Math.random() * 10);
  }

  // 8. Check win/lose conditions
  const endCheck = checkCampaignEnd({ ...state, day: nextDay, cash: upkeep.cash });
  if (endCheck.isOver) {
    campaign.isGameOver = true;
    campaign.hasWon = endCheck.hasWon;
    campaign.gameOverReason = endCheck.reason;
    newLogs.push(endCheck.reason);
  }

  // 9. Reputation naturally decays (-1/day) — you must actively maintain it
  let repPenalty = -1;
  if (upkeep.cash <= 0) repPenalty = -5;
  newLogs.push("Reputation fades slightly without active marketing (-1)");

  // 10. Comeback mechanic: emergency patron loan when broke
  if (upkeep.cash <= 0 && state.reputation >= 15) {
    upkeep.cash = 25; // Emergency funds
    repPenalty -= 8; // Costs reputation
    newLogs.push("EMERGENCY: A mysterious patron offers 25¤... at the cost of your reputation (-8)");
  }

  // 11. Roll for a random event (Slay the Spire-style)
  const randomEvent = pickRandomEvent(
    nextDay,
    upkeep.cash,
    clamp(state.reputation + repPenalty, 0, 100),
    state.triggeredRandomEventIds || [],
  );
  if (randomEvent) {
    newLogs.push(`A mysterious event stirs: ${randomEvent.name}...`);
  }

  return {
    ...state,
    day: nextDay,
    cash: upkeep.cash,
    reputation: clamp(state.reputation + repPenalty, 0, 100),
    dayPhase: "morning",
    dailyReport: undefined,
    rumors: newRumors,
    counterparties: updatedCounterparties,
    eventLog: [...state.eventLog, ...newLogs],
    campaign,
    activeEvents: allEvents,
    pendingDecisions: [],
    triggeredRandomEventIds: state.triggeredRandomEventIds || [],
    pendingRandomEvent: randomEvent ?? undefined,
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

// ═══════════════════════════════════════════════════════════════
// TRUST SYSTEM — counterparty relationships evolve
// ═══════════════════════════════════════════════════════════════

/**
 * Update counterparty trust based on an interaction outcome.
 * Successful interactions build trust, failures erode it.
 * Trust affects pricing and can lead to refusal of service.
 */
export function updateCounterpartyTrust(
  cp: Counterparty,
  success: boolean,
  day: number,
): Counterparty {
  let trustDelta = success ? 5 : -8;

  // Mood affects how much trust changes
  if (cp.mood === "hostile") trustDelta -= 3;
  if (cp.mood === "cooperative") trustDelta += 2;

  const newTrust = clamp(cp.trust + trustDelta, -100, 100);

  // Price modifier based on trust (high trust = discounts, low = markups)
  const newPriceMod = newTrust > 30 ? -0.1 : newTrust > 60 ? -0.2 : newTrust < -30 ? 0.15 : newTrust < -60 ? 0.3 : 0;

  // Refuse service below -80 trust
  const refuses = newTrust <= -80;

  return {
    ...cp,
    trust: newTrust,
    priceModifier: newPriceMod,
    lastInteractionDay: day,
    refusesService: refuses,
  };
}

// ═══════════════════════════════════════════════════════════════
// AGENT OPINION SYSTEM — agents remember and react
// ═══════════════════════════════════════════════════════════════

/**
 * Update an agent's opinion of a counterparty after an interaction.
 * Agents can develop preferences and refusals.
 */
export function updateAgentOpinion(
  agent: Agent,
  counterpartyId: string,
  success: boolean,
  wasWild: boolean,
  day: number,
): Agent {
  const defaultMemory = { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] as string[] };
  const agentMemory = agent.memory || defaultMemory;
  const memory = { ...agentMemory, opinions: [...(agentMemory.opinions || [])] };
  const existing = memory.opinions.find(o => o.counterpartyId === counterpartyId);

  const trustDelta = success ? 8 : -12;
  const wildBonus = wasWild ? (success ? 5 : -10) : 0;

  if (existing) {
    existing.trust = clamp(existing.trust + trustDelta + wildBonus, -100, 100);
    existing.reason = success
      ? "Last deal went well"
      : wasWild ? "Disaster last time — never again" : "Had a bad experience";
  } else {
    memory.opinions.push({
      counterpartyId,
      trust: clamp(trustDelta + wildBonus, -100, 100),
      reason: success ? "Good first impression" : "Bad first impression",
    });
  }

  // Agent refuses to work with counterparties they deeply distrust
  const refusals = memory.opinions
    .filter(o => o.trust <= -60)
    .map(o => o.counterpartyId);
  memory.refusals = refusals;
  memory.lastMissionDay = day;

  // Personality drift based on outcomes
  const shifts = [...memory.personalityShifts];
  let haggleMod = 0;
  let scoutMod = 0;
  let charmMod = 0;
  let riskMod = 0;

  if (wasWild && !success && agent.riskFactor > 0.2) {
    riskMod = -0.03; // Trauma makes agents more cautious
    shifts.push(`Day ${day}: Became more cautious after a wild failure`);
  } else if (wasWild && success) {
    riskMod = 0.02; // Success reinforces risk-taking
    shifts.push(`Day ${day}: Grew bolder after a spectacular win`);
  }

  // Agents get slightly better at what they do repeatedly
  if (success && agent.missionsCompleted > 3 && agent.missionsCompleted % 3 === 0) {
    if (agent.specialty === "trade") haggleMod = 1;
    else if (agent.specialty === "scout" || agent.specialty === "investigation") scoutMod = 1;
    else if (agent.specialty === "branding" || agent.specialty === "diplomacy") charmMod = 1;
    shifts.push(`Day ${day}: Skills improved through experience`);
  }

  memory.personalityShifts = shifts.slice(-10); // keep last 10 shifts

  return {
    ...agent,
    memory,
    haggleBonus: clamp(agent.haggleBonus + haggleMod, -20, 35),
    scoutBonus: clamp(agent.scoutBonus + scoutMod, -20, 35),
    charmBonus: clamp(agent.charmBonus + charmMod, -20, 35),
    riskFactor: clamp(agent.riskFactor + riskMod, 0.05, 0.7),
  };
}

// ═══════════════════════════════════════════════════════════════
// DAILY UPKEEP — money pressure
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate and apply daily upkeep costs.
 * Returns the new cash and any consequences.
 */
export function applyDailyUpkeep(state: GameState): { cash: number; events: string[]; agentsLost: string[] } {
  const upkeep = state.campaign?.upkeepPerDay ?? 8;
  const events: string[] = [];
  const agentsLost: string[] = [];

  let cash = state.cash - upkeep;
  events.push(`Daily upkeep: -${upkeep}¤ (rent and maintenance)`);

  // If broke, bad things happen
  if (cash < 0) {
    events.push("WARNING: Treasury is empty! The bazaar landlord is displeased.");

    // Reputation penalty for being broke
    events.push("Reputation -5 (can't pay your bills)");

    // Risk losing an agent if deeply in debt
    if (cash < -20) {
      events.push("CRITICAL: An agent may leave due to unpaid wages!");
    }

    cash = 0; // Can't go negative, but consequences apply
  }

  return { cash, events, agentsLost };
}

// ═══════════════════════════════════════════════════════════════
// ACTIONABLE RUMORS — rumors become events
// ═══════════════════════════════════════════════════════════════

import type { ActiveEvent, EventEffect, CampaignWeek } from "./gameData";
import { pickRandomEvent } from "./events/randomEvents";

/** Rumor-to-event conversion table */
const RUMOR_EVENTS: Record<string, () => ActiveEvent | null> = {
  "Cinnamon futures are rising. Someone's hoarding supply.": () => ({
    id: `event-${generateId()}`,
    name: "Cinnamon Rush",
    description: "Cinnamon trades pay 50% more for the next 2 days.",
    type: "market_shift",
    daysRemaining: 2,
    effects: [{ type: "price_modifier", target: "velvet-steps", value: 1.5, description: "Trade missions pay +50%" }],
    sourceRumor: "Cinnamon futures are rising. Someone's hoarding supply.",
  }),
  "Festival Week starts soon — stall permits will triple in price.": () => ({
    id: `event-${generateId()}`,
    name: "Festival Week",
    description: "Permit costs tripled, but branding missions give 2x reputation.",
    type: "market_shift",
    daysRemaining: 3,
    effects: [
      { type: "price_modifier", target: "festival-sprawl", value: 3.0, description: "Permits cost 3x" },
      { type: "reputation_modifier", value: 2.0, description: "Branding gives 2x reputation" },
    ],
    sourceRumor: "Festival Week starts soon — stall permits will triple in price.",
  }),
  "A foreign delegation is arriving. They buy luxury goods at absurd markups.": () => ({
    id: `event-${generateId()}`,
    name: "Foreign Delegation",
    description: "Luxury trades in The Velvet Steps pay double for 2 days.",
    type: "opportunity",
    daysRemaining: 2,
    effects: [{ type: "price_modifier", target: "velvet-steps", value: 2.0, description: "Velvet Steps trades pay 2x" }],
    sourceRumor: "A foreign delegation is arriving. They buy luxury goods at absurd markups.",
  }),
  "The mushroom inspectors are being bribed by a competitor. Watch your permits.": () => ({
    id: `event-${generateId()}`,
    name: "Inspector Corruption",
    description: "Inspections in the Fungal Quarter are unreliable for 2 days.",
    type: "crisis",
    daysRemaining: 2,
    effects: [{ type: "danger_modifier", target: "fungal-quarter", value: 2, description: "Fungal Quarter danger +2" }],
    sourceRumor: "The mushroom inspectors are being bribed by a competitor. Watch your permits.",
  }),
};

/**
 * Check if any current rumors should trigger events.
 */
export function processRumorEvents(state: GameState): ActiveEvent[] {
  const newEvents: ActiveEvent[] = [];

  for (const rumor of state.rumors) {
    const eventFactory = RUMOR_EVENTS[rumor];
    if (eventFactory && !(state.activeEvents || []).some(e => e.sourceRumor === rumor)) {
      // 30% chance each day that a matching rumor triggers its event
      if (roll(0.3)) {
        const event = eventFactory();
        if (event) newEvents.push(event);
      }
    }
  }

  return newEvents;
}

/**
 * Tick active events — decrease remaining days, remove expired ones.
 */
export function tickEvents(events: ActiveEvent[]): ActiveEvent[] {
  return events
    .map(e => ({ ...e, daysRemaining: e.daysRemaining - 1 }))
    .filter(e => e.daysRemaining > 0);
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN ARC — 30-day progression
// ═══════════════════════════════════════════════════════════════

/**
 * Get the current campaign week and generate week-specific events.
 */
export function getCampaignWeek(day: number): CampaignWeek {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

/**
 * Generate campaign events based on the current day.
 */
export function getCampaignEvent(day: number, state: GameState): ActiveEvent | null {
  // Week 2, Day 8: Rival brand arrives
  if (day === 8 && !state.campaign?.rivalBrand) {
    return {
      id: "campaign-rival-arrives",
      name: "A Rival Approaches",
      description: "A competing brand has set up shop in the bazaar. They're hungry, ambitious, and better funded than you.",
      type: "rival",
      daysRemaining: 99, // persistent
      effects: [
        { type: "rival_action", value: 1, description: "The Crimson Ledger begins competing for counterparties" },
      ],
    };
  }

  // Week 3, Day 15: Market crash
  if (day === 15) {
    return {
      id: "campaign-market-crash",
      name: "Market Crash!",
      description: "A supply chain disaster has tanked prices across all districts. Earnings halved for 3 days.",
      type: "crisis",
      daysRemaining: 3,
      effects: [
        { type: "price_modifier", value: 0.5, description: "All earnings halved" },
      ],
    };
  }

  // Week 4, Day 25: Grand Bazaar Championship announced
  if (day === 25) {
    return {
      id: "campaign-championship",
      name: "The Grand Bazaar Championship",
      description: "The most prestigious event in the bazaar. Reach 70 reputation by Day 30 to win!",
      type: "story",
      daysRemaining: 5,
      effects: [
        { type: "reputation_modifier", value: 1.5, description: "All reputation gains boosted by 50%" },
      ],
    };
  }

  return null;
}

/**
 * Check campaign win/lose conditions.
 */
export function checkCampaignEnd(state: GameState): { isOver: boolean; hasWon: boolean; reason: string } {
  if (state.day >= 30) {
    if (state.reputation >= 80 && state.cash > 50) {
      return { isOver: true, hasWon: true, reason: "You've won the Grand Bazaar Championship! Your brand is legendary." };
    }
    return { isOver: true, hasWon: false, reason: `Campaign over. Final reputation: ${state.reputation}/100, cash: ${state.cash}¤. You needed 80 rep and 50¤ to win.` };
  }

  // Game over if broke AND low reputation (the spiral has gone too far)
  if (state.cash <= 0 && state.reputation < 5) {
    return { isOver: true, hasWon: false, reason: "Bankrupt and forgotten. The bazaar has moved on without you." };
  }

  return { isOver: false, hasWon: false, reason: "" };
}
