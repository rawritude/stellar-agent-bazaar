import { describe, it, expect } from "vitest";
import {
  createInitialState,
  dispatchMission,
  resolveDay,
  advanceDay,
  startPlanning,
} from "./gameEngine";
import type { GameState } from "./gameData";

// ── Helpers ─────────────────────────────────────────────────

function dispatchFirstMission(state: GameState): GameState {
  const planning = startPlanning(state);
  const district = planning.districts[0]; // Velvet Steps
  const mission = district.availableMissions[0]; // Premium Goods Negotiation
  const agent = planning.agents.find(a => a.status === "idle")!;
  return dispatchMission(planning, mission, agent.id, district.id, mission.baseBudget, "balanced");
}

// ═══════════════════════════════════════════════════════════════
// EXISTING ENGINE BEHAVIOR — baseline regression tests
// ═══════════════════════════════════════════════════════════════

describe("gameEngine baseline", () => {
  it("creates initial state with correct defaults", () => {
    const state = createInitialState("Test Brand");
    expect(state.brandName).toBe("Test Brand");
    expect(state.day).toBe(1);
    expect(state.cash).toBe(100);
    expect(state.agents.length).toBe(5);
    expect(state.districts.length).toBe(3);
    expect(state.counterparties.length).toBe(9);
    expect(state.dayPhase).toBe("morning");
  });

  it("dispatches a mission and deducts cost", () => {
    const state = createInitialState();
    const dispatched = dispatchFirstMission(state);

    expect(dispatched.activeMissions.length).toBe(1);
    expect(dispatched.cash).toBeLessThan(state.cash);
    expect(dispatched.agents.find(a => a.status === "deployed")).toBeDefined();
  });

  it("resolves a day and produces a daily report", async () => {
    const state = createInitialState();
    const dispatched = dispatchFirstMission(state);
    const resolved = await resolveDay(dispatched);

    expect(resolved.dayPhase).toBe("reports");
    expect(resolved.dailyReport).toBeDefined();
    expect(resolved.dailyReport!.missionsRun).toBe(1);
    expect(resolved.completedMissions.length).toBe(1);
    expect(resolved.activeMissions.length).toBe(0);
  });

  it("advances to next day", async () => {
    const state = createInitialState();
    const dispatched = dispatchFirstMission(state);
    const resolved = await resolveDay(dispatched);
    const nextDay = advanceDay(resolved);

    expect(nextDay.day).toBe(2);
    expect(nextDay.dayPhase).toBe("morning");
  });
});

// ═══════════════════════════════════════════════════════════════
// SETTLEMENT INTEGRATION — action steps must carry receipts
// ═══════════════════════════════════════════════════════════════

describe("settlement integration in game engine", () => {
  it("every action step in a resolved mission has a receipt", async () => {
    const state = createInitialState();
    const dispatched = dispatchFirstMission(state);
    const resolved = await resolveDay(dispatched);

    const mission = resolved.completedMissions[0];
    expect(mission.result).toBeDefined();
    expect(mission.result!.actionSteps.length).toBeGreaterThan(0);

    for (const step of mission.result!.actionSteps) {
      expect(step.receipt).toBeDefined();
      expect(step.receipt!.receiptId).toBeTruthy();
      expect(step.receipt!.settlementMode).toBe("simulated");
      expect(step.receipt!.timestamp).toBeGreaterThan(0);
      expect(step.receipt!.actionType).toBe(step.actionType);
      expect(step.receipt!.counterpartyId).toBe(step.counterpartyId);
      expect(typeof step.receipt!.memo).toBe("string");
    }
  });

  it("receipt amounts match step costs", async () => {
    const state = createInitialState();
    const dispatched = dispatchFirstMission(state);
    const resolved = await resolveDay(dispatched);

    const steps = resolved.completedMissions[0].result!.actionSteps;
    for (const step of steps) {
      expect(step.receipt!.amount).toBe(step.cost);
    }
  });

  it("receipt status reflects step success", async () => {
    let state = createInitialState();
    state = { ...state, cash: 10000 };

    let planning = startPlanning(state);
    for (const district of planning.districts) {
      for (const mission of district.availableMissions) {
        const agent = planning.agents.find(a => a.status === "idle");
        if (!agent) break;
        planning = dispatchMission(planning, mission, agent.id, district.id, mission.baseBudget, "reckless");
      }
    }

    const resolved = await resolveDay(planning);
    const allSteps = resolved.completedMissions.flatMap(m => m.result?.actionSteps ?? []);

    expect(allSteps.length).toBeGreaterThan(0);
    for (const step of allSteps) {
      if (step.success) {
        expect(step.receipt!.status).toBe("confirmed");
      } else {
        expect(step.receipt!.status).toBe("failed");
      }
    }
  });

  it("all receipts across a day have unique IDs", async () => {
    let state = createInitialState();
    state = { ...state, cash: 10000 };

    let planning = startPlanning(state);
    for (const district of planning.districts) {
      for (const mission of district.availableMissions) {
        const agent = planning.agents.find(a => a.status === "idle");
        if (!agent) break;
        planning = dispatchMission(planning, mission, agent.id, district.id, mission.baseBudget, "balanced");
      }
    }

    const resolved = await resolveDay(planning);
    const allIds = resolved.completedMissions
      .flatMap(m => m.result?.actionSteps ?? [])
      .map(s => s.receipt!.receiptId);

    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("networkStats still tracks transactions correctly with receipts", async () => {
    const state = createInitialState();
    const dispatched = dispatchFirstMission(state);
    const resolved = await resolveDay(dispatched);

    const stepCount = resolved.completedMissions[0].result!.actionSteps.length;
    expect(resolved.networkStats.totalTransactions).toBe(stepCount);
    expect(resolved.networkStats.simulatedTransactions).toBe(stepCount);
  });
});

// ═══════════════════════════════════════════════════════════════
// FULL LOOP — multi-day regression
// ═══════════════════════════════════════════════════════════════

describe("multi-day game loop with receipts", () => {
  it("accumulates receipts across multiple days", async () => {
    let state = createInitialState();
    state = { ...state, cash: 10000 };

    for (let day = 0; day < 3; day++) {
      let planning = startPlanning(state);
      const district = planning.districts[0];
      const mission = district.availableMissions[0];
      const agent = planning.agents.find(a => a.status === "idle")!;
      planning = dispatchMission(planning, mission, agent.id, district.id, mission.baseBudget, "balanced");
      const resolved = await resolveDay(planning);
      state = advanceDay(resolved);
    }

    expect(state.completedMissions.length).toBe(3);

    const allReceipts = state.completedMissions
      .flatMap(m => m.result?.actionSteps ?? [])
      .map(s => s.receipt);

    expect(allReceipts.every(r => r !== undefined)).toBe(true);
    expect(new Set(allReceipts.map(r => r!.receiptId)).size).toBe(allReceipts.length);
  });
});
