// ═══════════════════════════════════════════════════════════════
// LIVE PLAYTEST SCRIPT — The Velvet Ledger
//
// Hits the running server at https://localhost:5000 to generate
// AI agents, then plays 10 days through the engine locally,
// logging every transition, choice, and outcome.
//
// Run: NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx playtest-live.ts
// ═══════════════════════════════════════════════════════════════

import {
  createInitialState,
  dispatchMission,
  resolveDay,
  advanceDay,
  startPlanning,
  canAffordMission,
  getReputationTier,
  getCashTier,
} from "./client/src/lib/gameEngine";

import type {
  GameState,
  Agent,
  MissionTemplate,
  District,
  RiskPosture,
} from "./client/src/lib/gameData";

const BASE_URL = "https://localhost:5000";
const DIVIDER = "-".repeat(70);
const THICK_DIVIDER = "=".repeat(70);
const TOTAL_DAYS = 10;

// ── Tracking ──────────────────────────────────────────────────

interface Finding {
  category: "bug" | "crash" | "feel" | "fun" | "data" | "balance";
  severity: "critical" | "major" | "minor" | "note";
  description: string;
  day?: number;
}

const findings: Finding[] = [];
const dayLogs: string[][] = [];

function finding(f: Finding) {
  findings.push(f);
  console.log(`  [${f.severity.toUpperCase()}/${f.category}] ${f.description}`);
}

function logLine(day: number, msg: string) {
  if (!dayLogs[day]) dayLogs[day] = [];
  dayLogs[day].push(msg);
  console.log(`  ${msg}`);
}

// ── API helper ────────────────────────────────────────────────

async function apiFetch(path: string, body?: any): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const opts: RequestInit = {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

// ── Strategy helpers ──────────────────────────────────────────

function getIdleAgents(state: GameState): Agent[] {
  return state.agents.filter(a => a.status === "idle");
}

function getAllMissions(state: GameState): { mission: MissionTemplate; district: District }[] {
  const result: { mission: MissionTemplate; district: District }[] = [];
  for (const district of state.districts) {
    if (!district.isUnlocked) continue;
    for (const mission of district.availableMissions) {
      result.push({ mission, district });
    }
  }
  return result;
}

function pickBestAgent(agents: Agent[], mission: MissionTemplate): Agent | undefined {
  const scored = agents.map(agent => {
    let score = 0;
    if (mission.type === "trade" || mission.type === "sabotage") score = agent.haggleBonus;
    else if (mission.type === "scout" || mission.type === "investigation") score = agent.scoutBonus;
    else if (mission.type === "branding" || mission.type === "diplomacy") score = agent.charmBonus;
    score += (agent.morale - 50) / 10;
    score -= agent.costPerMission / 5;
    return { agent, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.agent;
}

// ── Strategic mission picking ─────────────────────────────────
// Vary strategy per day to test different code paths

function pickMissionsForDay(day: number, state: GameState): { mission: MissionTemplate; district: District; posture: RiskPosture; budgetOverride?: number }[] {
  const missions = getAllMissions(state);
  if (missions.length === 0) return [];

  const picks: { mission: MissionTemplate; district: District; posture: RiskPosture; budgetOverride?: number }[] = [];

  // Day 1-3: cautious trade missions
  // Day 4-5: balanced scout/investigation
  // Day 6-7: reckless branding + sabotage
  // Day 8-9: theatrical high-budget missions
  // Day 10: all-in on everything

  const strategy = day <= 3 ? "cautious-trade"
    : day <= 5 ? "balanced-scout"
    : day <= 7 ? "reckless-brand"
    : day <= 9 ? "theatrical-big"
    : "all-in";

  switch (strategy) {
    case "cautious-trade": {
      const trades = missions.filter(m => m.mission.type === "trade" && m.mission.riskLevel <= 3);
      const pick1 = trades[day % trades.length] || missions[0];
      picks.push({ ...pick1, posture: "cautious" });
      if (day >= 2 && missions.length > 1) {
        const scouts = missions.filter(m => m.mission.type === "scout" || m.mission.type === "investigation");
        const pick2 = scouts[0] || missions[1 % missions.length];
        picks.push({ ...pick2, posture: "cautious" });
      }
      break;
    }
    case "balanced-scout": {
      const scouts = missions.filter(m => m.mission.type === "scout" || m.mission.type === "investigation");
      const pick1 = scouts[day % Math.max(scouts.length, 1)] || missions[0];
      picks.push({ ...pick1, posture: "balanced" });
      const diplo = missions.filter(m => m.mission.type === "diplomacy");
      if (diplo.length > 0) picks.push({ ...diplo[0], posture: "balanced" });
      else picks.push({ ...missions[day % missions.length], posture: "balanced" });
      break;
    }
    case "reckless-brand": {
      const brands = missions.filter(m => m.mission.type === "branding");
      const pick1 = brands[0] || missions[0];
      picks.push({ ...pick1, posture: "reckless" });
      const sabo = missions.filter(m => m.mission.type === "sabotage");
      if (sabo.length > 0) picks.push({ ...sabo[0], posture: "reckless" });
      else picks.push({ ...missions[Math.min(1, missions.length - 1)], posture: "reckless" });
      break;
    }
    case "theatrical-big": {
      // High-budget theatrical missions
      const sorted = [...missions].sort((a, b) => b.mission.baseReward - a.mission.baseReward);
      picks.push({ ...sorted[0], posture: "theatrical", budgetOverride: sorted[0].mission.baseBudget + 15 });
      if (sorted.length > 1) {
        picks.push({ ...sorted[1], posture: "theatrical", budgetOverride: sorted[1].mission.baseBudget + 10 });
      }
      break;
    }
    case "all-in": {
      // Dispatch everything we can
      for (let i = 0; i < Math.min(3, missions.length); i++) {
        const postures: RiskPosture[] = ["cautious", "reckless", "theatrical"];
        picks.push({ ...missions[i], posture: postures[i % postures.length] });
      }
      break;
    }
  }

  return picks;
}

// ── Field validation ──────────────────────────────────────────

function validateNewFields(state: GameState, label: string, day: number) {
  // campaign
  if (!state.campaign) {
    finding({ category: "crash", severity: "critical", description: `${label}: state.campaign is missing/undefined`, day });
  } else {
    if (state.campaign.week === undefined) finding({ category: "data", severity: "major", description: `${label}: campaign.week is undefined`, day });
    if (state.campaign.totalDays === undefined) finding({ category: "data", severity: "major", description: `${label}: campaign.totalDays is undefined`, day });
    if (state.campaign.upkeepPerDay === undefined) finding({ category: "data", severity: "major", description: `${label}: campaign.upkeepPerDay is undefined`, day });
    if (state.campaign.isGameOver === undefined) finding({ category: "data", severity: "major", description: `${label}: campaign.isGameOver is undefined`, day });
    if (state.campaign.hasWon === undefined) finding({ category: "data", severity: "major", description: `${label}: campaign.hasWon is undefined`, day });
    if (typeof state.campaign.rivalReputation !== "number") finding({ category: "data", severity: "major", description: `${label}: campaign.rivalReputation not a number (${state.campaign.rivalReputation})`, day });
    if (typeof state.campaign.rivalCash !== "number") finding({ category: "data", severity: "major", description: `${label}: campaign.rivalCash not a number (${state.campaign.rivalCash})`, day });
  }

  // activeEvents
  if (!Array.isArray(state.activeEvents)) {
    finding({ category: "crash", severity: "critical", description: `${label}: state.activeEvents is not an array (${typeof state.activeEvents})`, day });
  }

  // triggeredRandomEventIds
  if (!Array.isArray(state.triggeredRandomEventIds)) {
    finding({ category: "crash", severity: "critical", description: `${label}: state.triggeredRandomEventIds is not an array (${typeof state.triggeredRandomEventIds})`, day });
  }

  // pendingDecisions
  if (!Array.isArray(state.pendingDecisions)) {
    finding({ category: "data", severity: "minor", description: `${label}: state.pendingDecisions is not an array`, day });
  }

  // counterparties should all have trust fields
  for (const cp of state.counterparties) {
    if (typeof cp.trust !== "number" || isNaN(cp.trust)) {
      finding({ category: "bug", severity: "major", description: `${label}: counterparty "${cp.name}" trust is ${cp.trust} (not a valid number)`, day });
    }
    if (typeof cp.priceModifier !== "number" || isNaN(cp.priceModifier)) {
      finding({ category: "bug", severity: "major", description: `${label}: counterparty "${cp.name}" priceModifier is ${cp.priceModifier}`, day });
    }
    if (cp.refusesService === undefined) {
      finding({ category: "bug", severity: "minor", description: `${label}: counterparty "${cp.name}" refusesService is undefined`, day });
    }
  }

  // agents should have valid morale/stats
  for (const agent of state.agents) {
    if (agent.morale < 0 || agent.morale > 100) {
      finding({ category: "bug", severity: "major", description: `${label}: agent "${agent.name}" morale out of range: ${agent.morale}`, day });
    }
    if (agent.riskFactor < 0 || agent.riskFactor > 1) {
      finding({ category: "bug", severity: "major", description: `${label}: agent "${agent.name}" riskFactor out of range: ${agent.riskFactor}`, day });
    }
    if (!agent.memory) {
      finding({ category: "bug", severity: "major", description: `${label}: agent "${agent.name}" has no memory object`, day });
    }
  }
}

function checkForWhiteScreenBug(fn: () => any, label: string, day: number): boolean {
  try {
    const result = fn();
    // If it's a promise, we can't catch sync errors here
    if (result && typeof result.then === "function") return false; // handled separately
    return false;
  } catch (err: any) {
    finding({ category: "crash", severity: "critical", description: `WHITE SCREEN BUG in ${label}: ${err.message}\n    Stack: ${err.stack?.split("\n").slice(0, 3).join("\n    ")}`, day });
    return true;
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log(THICK_DIVIDER);
  console.log("THE VELVET LEDGER BAZAAR -- LIVE PLAYTEST SESSION");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Server: ${BASE_URL}`);
  console.log(`Days to play: ${TOTAL_DAYS}`);
  console.log(THICK_DIVIDER);

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Generate agents from the live server
  // ═══════════════════════════════════════════════════════════
  console.log("\n--- STEP 1: Generate Agents via Server ---");
  console.log(`POST ${BASE_URL}/api/generate-agents with brandName "Desert Rose Trading"`);

  let generatedAgents: any[] | null = null;
  let agentGenError: string | null = null;

  try {
    const result = await apiFetch("/api/generate-agents", {
      brandName: "Desert Rose Trading",
    });

    if (result.error) {
      agentGenError = result.error;
      console.log(`  Agent generation returned error: ${result.error}`);
      finding({ category: "bug", severity: "major", description: `Agent generation API returned error: ${result.error}` });
    } else if (result.agents && Array.isArray(result.agents)) {
      generatedAgents = result.agents;
      console.log(`  Generated ${result.agents.length} agents:`);
      for (const a of result.agents) {
        console.log(`    ${a.emoji} ${a.name} -- ${a.title} [${a.rarity}]`);
        console.log(`      Specialty: ${a.specialty} | Haggle: ${a.haggleBonus} | Scout: ${a.scoutBonus} | Charm: ${a.charmBonus}`);
        console.log(`      Risk: ${a.riskFactor} | Cost: ${a.costPerMission} | Quirk: ${a.quirk}`);
      }
      if (result.budget) {
        console.log(`  Budget status: ${JSON.stringify(result.budget)}`);
      }
      finding({ category: "fun", severity: "note", description: `Agent generation succeeded: ${result.agents.map((a: any) => `${a.name} [${a.rarity}]`).join(", ")}` });
    } else {
      agentGenError = "No agents in response";
      console.log("  No agents returned (and no error field)");
      finding({ category: "bug", severity: "major", description: "Agent generation returned neither agents nor error" });
    }
  } catch (err: any) {
    agentGenError = err.message;
    console.log(`  FETCH ERROR: ${err.message}`);
    finding({ category: "crash", severity: "critical", description: `Server unreachable or errored: ${err.message}` });
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Create initial game state
  // ═══════════════════════════════════════════════════════════
  console.log("\n--- STEP 2: Create Initial State ---");

  let state: GameState;
  try {
    state = createInitialState("Desert Rose Trading");
    console.log(`  Initial state created: Day ${state.day}, Cash ${state.cash}, Rep ${state.reputation}`);
    console.log(`  Default agents: ${state.agents.map(a => `${a.emoji} ${a.name}`).join(", ")}`);
    console.log(`  Districts: ${state.districts.map(d => `${d.emoji} ${d.name} (${d.isUnlocked ? "unlocked" : "locked"})`).join(", ")}`);
    console.log(`  Counterparties: ${state.counterparties.length}`);
    console.log(`  Campaign: week=${state.campaign.week}, totalDays=${state.campaign.totalDays}, upkeep=${state.campaign.upkeepPerDay}`);
    console.log(`  activeEvents: ${JSON.stringify(state.activeEvents)}`);
    console.log(`  triggeredRandomEventIds: ${JSON.stringify(state.triggeredRandomEventIds)}`);
    console.log(`  pendingDecisions: ${JSON.stringify(state.pendingDecisions)}`);
    validateNewFields(state, "createInitialState", 0);
  } catch (err: any) {
    console.log(`  CRASH in createInitialState: ${err.message}`);
    finding({ category: "crash", severity: "critical", description: `createInitialState crashed: ${err.message}` });
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Replace agents with generated ones
  // ═══════════════════════════════════════════════════════════
  console.log("\n--- STEP 3: Replace Agents ---");

  if (generatedAgents && generatedAgents.length >= 2) {
    const aiAgents: Agent[] = generatedAgents.map((a: any, i: number) => ({
      id: `ai-agent-${i}`,
      name: a.name,
      title: a.title,
      emoji: a.emoji,
      specialty: a.specialty,
      description: a.description || "",
      quirk: a.quirk || "",
      haggleBonus: a.haggleBonus ?? 0,
      scoutBonus: a.scoutBonus ?? 0,
      charmBonus: a.charmBonus ?? 0,
      riskFactor: a.riskFactor ?? 0.25,
      costPerMission: a.costPerMission ?? 8,
      morale: 75,
      status: "idle" as const,
      missionsCompleted: 0,
      memory: { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] },
    }));

    state = { ...state, agents: aiAgents };
    console.log(`  Swapped in ${aiAgents.length} AI-generated agents:`);
    for (const a of aiAgents) {
      console.log(`    ${a.emoji} ${a.name} (${a.specialty}) -- H:${a.haggleBonus} S:${a.scoutBonus} C:${a.charmBonus} Risk:${a.riskFactor} Fee:${a.costPerMission}`);
    }

    // Validate the swapped state
    validateNewFields(state, "after-agent-swap", 0);
  } else {
    console.log("  Using default agents (AI generation failed or returned too few)");
    finding({ category: "feel", severity: "minor", description: "Fell back to default agents -- AI generation did not produce enough" });
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Play through 10 days
  // ═══════════════════════════════════════════════════════════
  console.log(`\n${THICK_DIVIDER}`);
  console.log("PLAYING 10 DAYS");
  console.log(THICK_DIVIDER);

  const cashHistory: number[] = [state.cash];
  const repHistory: number[] = [state.reputation];

  for (let dayNum = 1; dayNum <= TOTAL_DAYS; dayNum++) {
    console.log(`\n${DIVIDER}`);
    console.log(`DAY ${dayNum} | Cash: ${state.cash} | Rep: ${state.reputation}/100 (${getReputationTier(state.reputation).name}) | ${getCashTier(state.cash).name}`);
    console.log(`  Phase: ${state.dayPhase} | Active events: ${state.activeEvents.length} | Campaign week: ${state.campaign.week}`);
    console.log(DIVIDER);

    // Check game over
    if (state.campaign.isGameOver) {
      logLine(dayNum, `GAME OVER: ${state.campaign.gameOverReason}`);
      finding({ category: "feel", severity: "note", description: `Game ended on day ${dayNum}: ${state.campaign.gameOverReason}`, day: dayNum });
      break;
    }

    // Log active events
    if (state.activeEvents.length > 0) {
      logLine(dayNum, `Active events:`);
      for (const evt of state.activeEvents) {
        logLine(dayNum, `  [${evt.type}] ${evt.name} -- ${evt.description} (${evt.daysRemaining}d remaining)`);
      }
    }

    // Log pending random event
    if (state.pendingRandomEvent) {
      logLine(dayNum, `Pending random event: "${state.pendingRandomEvent.name}" (${state.pendingRandomEvent.artCategory})`);
      logLine(dayNum, `  Narration: ${state.pendingRandomEvent.narration.join(" ")}`);
      logLine(dayNum, `  Choices: ${state.pendingRandomEvent.choices.map(c => c.label).join(" | ")}`);
      finding({ category: "fun", severity: "note", description: `Random event fired: "${state.pendingRandomEvent.name}"`, day: dayNum });

      // Simulate choosing the first option (we don't resolve it in the engine,
      // but we note it for playtest purposes)
      logLine(dayNum, `  [PLAYTEST] Would choose: "${state.pendingRandomEvent.choices[0]?.label}"`);
    }

    // ── SCREEN TRANSITION: morning -> planning ──
    logLine(dayNum, `TRANSITION: ${state.dayPhase} -> planning`);
    try {
      state = startPlanning(state);
      logLine(dayNum, `  Now in phase: ${state.dayPhase}`);
    } catch (err: any) {
      finding({ category: "crash", severity: "critical", description: `startPlanning crashed: ${err.message}`, day: dayNum });
      break;
    }

    // ── DISPATCH MISSIONS ──
    const missionPicks = pickMissionsForDay(dayNum, state);
    let dispatched = 0;

    for (const pick of missionPicks) {
      const idleAgents = getIdleAgents(state);
      if (idleAgents.length === 0) {
        logLine(dayNum, `  No idle agents remaining`);
        break;
      }

      const agent = pickBestAgent(idleAgents, pick.mission);
      if (!agent) {
        logLine(dayNum, `  No suitable agent for "${pick.mission.name}"`);
        continue;
      }

      const budget = pick.budgetOverride
        ? Math.min(pick.budgetOverride, state.cash - agent.costPerMission - 5)
        : pick.mission.baseBudget;

      if (budget <= 0) {
        logLine(dayNum, `  Budget too low for "${pick.mission.name}" (cash: ${state.cash}, need: ${pick.mission.baseBudget + agent.costPerMission})`);
        continue;
      }

      if (!canAffordMission(state, pick.mission, budget, agent)) {
        logLine(dayNum, `  Cannot afford "${pick.mission.name}" (budget: ${budget}, fee: ${agent.costPerMission}, cash: ${state.cash})`);
        continue;
      }

      logLine(dayNum, `DISPATCH: ${agent.emoji} ${agent.name} -> ${pick.district.emoji} "${pick.mission.name}" in ${pick.district.name}`);
      logLine(dayNum, `  Posture: ${pick.posture} | Budget: ${budget} | Agent fee: ${agent.costPerMission} | Total: ${budget + agent.costPerMission}`);
      logLine(dayNum, `  Mission type: ${pick.mission.type} | Risk: ${pick.mission.riskLevel}/5 | Actions: ${pick.mission.actionSequence.join(" -> ")}`);

      try {
        const preCash = state.cash;
        state = dispatchMission(state, pick.mission, agent.id, pick.district.id, budget, pick.posture);
        const postCash = state.cash;
        logLine(dayNum, `  Cash: ${preCash} -> ${postCash} (-${preCash - postCash})`);
        dispatched++;
      } catch (err: any) {
        finding({ category: "crash", severity: "critical", description: `dispatchMission crashed: ${err.message}`, day: dayNum });
      }
    }

    if (dispatched === 0) {
      logLine(dayNum, `  No missions dispatched this day`);
      finding({ category: "feel", severity: "minor", description: `Day ${dayNum}: could not dispatch any missions (cash: ${state.cash})`, day: dayNum });
    }

    logLine(dayNum, `  Active missions: ${state.activeMissions.length}`);

    // ── SCREEN TRANSITION: planning -> resolution ──
    logLine(dayNum, `TRANSITION: ${state.dayPhase} -> resolution (resolveDay)`);
    const preResolveCash = state.cash;
    const preResolveRep = state.reputation;

    try {
      state = await resolveDay(state);
      logLine(dayNum, `  resolveDay completed successfully`);
      logLine(dayNum, `  Phase after resolve: ${state.dayPhase}`);
      logLine(dayNum, `  Cash: ${preResolveCash} -> ${state.cash} (delta: ${state.cash - preResolveCash >= 0 ? "+" : ""}${state.cash - preResolveCash})`);
      logLine(dayNum, `  Rep: ${preResolveRep} -> ${state.reputation} (delta: ${state.reputation - preResolveRep >= 0 ? "+" : ""}${state.reputation - preResolveRep})`);
    } catch (err: any) {
      finding({ category: "crash", severity: "critical", description: `resolveDay CRASHED (white screen bug?): ${err.message}\n    Stack: ${err.stack?.split("\n").slice(0, 5).join("\n    ")}`, day: dayNum });
      // Try to recover
      logLine(dayNum, `  ATTEMPTING RECOVERY: clearing activeMissions and continuing`);
      state = {
        ...state,
        activeMissions: [],
        dayPhase: "reports" as const,
      };
    }

    // Validate state after resolve
    validateNewFields(state, `after-resolveDay-day${dayNum}`, dayNum);

    // ── LOG DAILY REPORT ──
    if (state.dailyReport) {
      const r = state.dailyReport;
      logLine(dayNum, `DAILY REPORT:`);
      logLine(dayNum, `  Missions run: ${r.missionsRun}`);
      logLine(dayNum, `  Earned: ${r.totalEarned} | Spent: ${r.totalSpent} | Net: ${r.netChange >= 0 ? "+" : ""}${r.netChange}`);
      logLine(dayNum, `  Rep change: ${r.reputationChange >= 0 ? "+" : ""}${r.reputationChange}`);
      if (r.headlines.length > 0) {
        logLine(dayNum, `  Headlines:`);
        for (const h of r.headlines) {
          logLine(dayNum, `    "${h}"`);
        }
      }
      if (r.counterpartiesEngaged.length > 0) {
        logLine(dayNum, `  Counterparties engaged: ${r.counterpartiesEngaged.join(", ")}`);
      }
      if (r.actionBreakdown.length > 0) {
        logLine(dayNum, `  Action breakdown: ${r.actionBreakdown.map(ab => `${ab.action}:${ab.count}`).join(", ")}`);
      }
      if (r.rumors.length > 0) {
        logLine(dayNum, `  Rumors: ${r.rumors.join("; ")}`);
      }
    } else {
      logLine(dayNum, `  NO DAILY REPORT (this may be a bug if missions were dispatched)`);
      if (dispatched > 0) {
        finding({ category: "bug", severity: "major", description: `Day ${dayNum}: missions dispatched but no dailyReport after resolveDay`, day: dayNum });
      }
    }

    // ── LOG COMPLETED MISSION DETAILS ──
    const missionsRun = state.dailyReport?.missionsRun ?? 0;
    const todayMissions = missionsRun > 0 ? state.completedMissions.slice(-missionsRun) : [];
    for (const m of todayMissions) {
      if (m.result) {
        const r = m.result;
        logLine(dayNum, `  Mission "${m.template.name}" result:`);
        logLine(dayNum, `    Success: ${r.success} | Earned: ${r.moneyEarned} | Spent: ${r.moneySpent} | Net: ${r.netProfit}`);
        logLine(dayNum, `    Counterparty trail: ${r.actionSteps.map(s => `${s.counterpartyEmoji}${s.counterpartyName}(${s.success ? "OK" : "FAIL"})`).join(" -> ")}`);
        if (r.sideEffect) logLine(dayNum, `    Side effect: ${r.sideEffect}`);
        if (r.rumorGained) logLine(dayNum, `    Rumor gained: "${r.rumorGained}"`);
        for (const detail of r.details) {
          logLine(dayNum, `    ${detail}`);
        }
      }
    }

    // ── LOG AGENT STATES ──
    logLine(dayNum, `AGENT STATUS:`);
    for (const a of state.agents) {
      logLine(dayNum, `  ${a.emoji} ${a.name}: morale=${a.morale} status=${a.status} missions=${a.missionsCompleted}`);
      if (a.memory.refusals.length > 0) {
        const refusalNames = a.memory.refusals.map(rid => {
          const cp = state.counterparties.find(c => c.id === rid);
          return cp?.name || rid;
        });
        logLine(dayNum, `    REFUSES: ${refusalNames.join(", ")}`);
      }
      if (a.memory.personalityShifts.length > 0) {
        logLine(dayNum, `    Personality shifts: ${a.memory.personalityShifts.join("; ")}`);
      }
    }

    // ── SCREEN TRANSITION: resolution -> morning (advanceDay) ──
    logLine(dayNum, `TRANSITION: ${state.dayPhase} -> morning (advanceDay)`);
    const preAdvanceCash = state.cash;
    const preAdvanceRep = state.reputation;

    try {
      state = advanceDay(state);
      logLine(dayNum, `  advanceDay completed successfully`);
      logLine(dayNum, `  Now: Day ${state.day}, Phase: ${state.dayPhase}`);
      logLine(dayNum, `  Cash: ${preAdvanceCash} -> ${state.cash} (upkeep + effects)`);
      logLine(dayNum, `  Rep: ${preAdvanceRep} -> ${state.reputation} (decay + effects)`);
      logLine(dayNum, `  Campaign: week=${state.campaign.week}, rival=${state.campaign.rivalBrand || "none"}, rivalRep=${state.campaign.rivalReputation}`);
    } catch (err: any) {
      finding({ category: "crash", severity: "critical", description: `advanceDay CRASHED: ${err.message}\n    Stack: ${err.stack?.split("\n").slice(0, 5).join("\n    ")}`, day: dayNum });
      break;
    }

    // Validate after advance
    validateNewFields(state, `after-advanceDay-day${dayNum}`, dayNum);

    cashHistory.push(state.cash);
    repHistory.push(state.reputation);

    // ── FEEL CHECKS ──
    if (state.cash <= 10) {
      finding({ category: "balance", severity: "minor", description: `Cash critically low: ${state.cash}`, day: dayNum });
    }
    if (state.reputation <= 5) {
      finding({ category: "balance", severity: "minor", description: `Reputation critically low: ${state.reputation}`, day: dayNum });
    }
    if (state.reputation >= 70 && dayNum <= 5) {
      finding({ category: "balance", severity: "major", description: `Reputation reached ${state.reputation} by day ${dayNum} -- too fast?`, day: dayNum });
    }

    // Check counterparty trust movement
    const highTrust = state.counterparties.filter(c => c.trust >= 40);
    const lowTrust = state.counterparties.filter(c => c.trust <= -40);
    if (highTrust.length > 0) {
      finding({ category: "fun", severity: "note", description: `High-trust counterparties: ${highTrust.map(c => `${c.name}(${c.trust})`).join(", ")}`, day: dayNum });
    }
    if (lowTrust.length > 0) {
      finding({ category: "feel", severity: "note", description: `Low-trust counterparties: ${lowTrust.map(c => `${c.name}(${c.trust})`).join(", ")}`, day: dayNum });
    }
    const refusing = state.counterparties.filter(c => c.refusesService);
    if (refusing.length > 0) {
      finding({ category: "fun", severity: "note", description: `Counterparties refusing service: ${refusing.map(c => c.name).join(", ")}`, day: dayNum });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Final Summary
  // ═══════════════════════════════════════════════════════════
  console.log(`\n\n${THICK_DIVIDER}`);
  console.log("PLAYTEST SUMMARY");
  console.log(THICK_DIVIDER);

  console.log(`\nFinal state: Day ${state.day} | Cash: ${state.cash} | Rep: ${state.reputation}/100`);
  console.log(`Campaign: ${state.campaign.isGameOver ? (state.campaign.hasWon ? "WON" : "LOST") : "ONGOING"}`);
  if (state.campaign.gameOverReason) console.log(`  Reason: ${state.campaign.gameOverReason}`);
  console.log(`Cash trajectory: ${cashHistory.join(" -> ")}`);
  console.log(`Rep trajectory: ${repHistory.join(" -> ")}`);

  console.log(`\nFinal agents:`);
  for (const a of state.agents) {
    console.log(`  ${a.emoji} ${a.name}: morale=${a.morale}, missions=${a.missionsCompleted}, H:${a.haggleBonus} S:${a.scoutBonus} C:${a.charmBonus}`);
  }

  console.log(`\nFinal counterparty trust:`);
  for (const cp of state.counterparties) {
    if (cp.trust !== 0 || cp.interactionCount > 0) {
      console.log(`  ${cp.emoji} ${cp.name}: trust=${cp.trust}, interactions=${cp.interactionCount}, mood=${cp.mood}${cp.refusesService ? " [REFUSES SERVICE]" : ""}`);
    }
  }

  // ── FINDINGS REPORT ──
  console.log(`\n${DIVIDER}`);
  console.log(`FINDINGS (${findings.length} total)`);
  console.log(DIVIDER);

  const crashes = findings.filter(f => f.category === "crash");
  const bugs = findings.filter(f => f.category === "bug");
  const balance = findings.filter(f => f.category === "balance");
  const feel = findings.filter(f => f.category === "feel");
  const fun = findings.filter(f => f.category === "fun");
  const data = findings.filter(f => f.category === "data");

  if (crashes.length > 0) {
    console.log(`\nCRASHES (${crashes.length}):`);
    for (const f of crashes) console.log(`  [${f.severity}] Day ${f.day ?? "?"}: ${f.description}`);
  }

  if (bugs.length > 0) {
    console.log(`\nBUGS (${bugs.length}):`);
    for (const f of bugs) console.log(`  [${f.severity}] Day ${f.day ?? "?"}: ${f.description}`);
  }

  if (data.length > 0) {
    console.log(`\nDATA ISSUES (${data.length}):`);
    for (const f of data) console.log(`  [${f.severity}] Day ${f.day ?? "?"}: ${f.description}`);
  }

  if (balance.length > 0) {
    console.log(`\nBALANCE (${balance.length}):`);
    for (const f of balance) console.log(`  [${f.severity}] Day ${f.day ?? "?"}: ${f.description}`);
  }

  if (feel.length > 0) {
    console.log(`\nFEEL (${feel.length}):`);
    for (const f of feel) console.log(`  [${f.severity}] Day ${f.day ?? "?"}: ${f.description}`);
  }

  if (fun.length > 0) {
    console.log(`\nFUN MOMENTS (${fun.length}):`);
    for (const f of fun) console.log(`  [${f.severity}] Day ${f.day ?? "?"}: ${f.description}`);
  }

  // ── KEY QUESTIONS ──
  console.log(`\n${DIVIDER}`);
  console.log("KEY QUESTION ANSWERS");
  console.log(DIVIDER);

  const resolveDayCrashes = crashes.filter(f => f.description.includes("resolveDay"));
  const advanceDayCrashes = crashes.filter(f => f.description.includes("advanceDay"));
  const fieldIssues = [...data, ...bugs].filter(f =>
    f.description.includes("campaign") || f.description.includes("activeEvents") || f.description.includes("triggeredRandomEventIds")
  );

  console.log(`\n1. Does resolveDay actually work?`);
  if (resolveDayCrashes.length === 0) {
    console.log("   YES -- resolveDay completed without crashes on all days played.");
  } else {
    console.log(`   NO -- resolveDay crashed ${resolveDayCrashes.length} time(s):`);
    for (const f of resolveDayCrashes) console.log(`     ${f.description}`);
  }

  console.log(`\n2. Does advanceDay crash?`);
  if (advanceDayCrashes.length === 0) {
    console.log("   NO -- advanceDay completed without crashes on all days played.");
  } else {
    console.log(`   YES -- advanceDay crashed ${advanceDayCrashes.length} time(s):`);
    for (const f of advanceDayCrashes) console.log(`     ${f.description}`);
  }

  console.log(`\n3. Are new fields (campaign, activeEvents, triggeredRandomEventIds) properly initialized?`);
  if (fieldIssues.length === 0) {
    console.log("   YES -- all new fields were properly initialized and maintained throughout the session.");
  } else {
    console.log(`   ISSUES FOUND (${fieldIssues.length}):`);
    for (const f of fieldIssues) console.log(`     ${f.description}`);
  }

  console.log(`\n4. White screen bug (resolveDay crash)?`);
  const whiteScreen = crashes.filter(f => f.description.includes("white screen") || f.description.includes("resolveDay CRASHED"));
  if (whiteScreen.length === 0) {
    console.log("   NOT REPRODUCED -- resolveDay did not crash during this playtest.");
  } else {
    console.log(`   REPRODUCED ${whiteScreen.length} time(s):`);
    for (const f of whiteScreen) console.log(`     ${f.description}`);
  }

  console.log(`\n${THICK_DIVIDER}`);
  console.log("LIVE PLAYTEST COMPLETE");
  console.log(THICK_DIVIDER);

  // Return findings for the markdown report
  return {
    findings,
    cashHistory,
    repHistory,
    state,
    generatedAgents,
    agentGenError,
    dayLogs,
  };
}

// ═══════════════════════════════════════════════════════════════
// Run and capture output
// ═══════════════════════════════════════════════════════════════

main().then(result => {
  console.log("\nPlaytest finished. Writing PLAYTEST_LIVE.md...");

  // We write the findings summary to stdout so it can be captured
  // The actual markdown file will be written by the calling process
  process.exit(0);
}).catch(err => {
  console.error("Playtest FAILED with uncaught error:", err);
  process.exit(1);
});
