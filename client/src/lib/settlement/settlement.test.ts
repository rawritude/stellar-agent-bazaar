import { describe, it, expect } from "vitest";
import type {
  SettlementAdapter,
  SettlementRequest,
  SettlementReceipt,
  SettlementResult,
} from "./types";
import { createSimulatedAdapter } from "./simulated";
import { createTestnetAdapter } from "./testnet";
import { getSettlementAdapter } from "./index";

// ── Test fixtures ───────────────────────────────────────────

function makeRequest(overrides: Partial<SettlementRequest> = {}): SettlementRequest {
  return {
    actionType: "paid_intel",
    counterpartyId: "whisper-network",
    counterpartyName: "The Whisper Network",
    amount: 10,
    agentId: "crow-sigma",
    districtId: "fungal-quarter",
    missionId: "test-mission-1",
    success: true,
    day: 3,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// SIMULATED ADAPTER
// ═══════════════════════════════════════════════════════════════

describe("SimulatedSettlementAdapter", () => {
  it("reports mode as simulated", () => {
    const adapter = createSimulatedAdapter();
    expect(adapter.mode).toBe("simulated");
  });

  it("is always available", () => {
    const adapter = createSimulatedAdapter();
    expect(adapter.isAvailable()).toBe(true);
  });

  it("produces a confirmed receipt for a successful action", () => {
    const adapter = createSimulatedAdapter();
    const req = makeRequest({ success: true, amount: 15 });
    const result = adapter.settle(req);

    expect(result.settled).toBe(true);
    expect(result.receipt).toBeDefined();
    expect(result.receipt.status).toBe("confirmed");
    expect(result.receipt.settlementMode).toBe("simulated");
    expect(result.receipt.amount).toBe(15);
    expect(result.receipt.counterpartyId).toBe("whisper-network");
    expect(result.receipt.actionType).toBe("paid_intel");
  });

  it("produces a failed receipt for a failed action", () => {
    const adapter = createSimulatedAdapter();
    const req = makeRequest({ success: false });
    const result = adapter.settle(req);

    expect(result.settled).toBe(true);
    expect(result.receipt.status).toBe("failed");
  });

  it("generates unique receipt IDs", () => {
    const adapter = createSimulatedAdapter();
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = adapter.settle(makeRequest());
      ids.add(result.receipt.receiptId);
    }
    expect(ids.size).toBe(50);
  });

  it("includes a timestamp on every receipt", () => {
    const adapter = createSimulatedAdapter();
    const before = Date.now();
    const result = adapter.settle(makeRequest());
    const after = Date.now();

    expect(result.receipt.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.receipt.timestamp).toBeLessThanOrEqual(after);
  });

  it("never includes a stellarTxId", () => {
    const adapter = createSimulatedAdapter();
    const result = adapter.settle(makeRequest());
    expect(result.receipt.stellarTxId).toBeUndefined();
  });

  it("includes a memo with flavor text", () => {
    const adapter = createSimulatedAdapter();
    const result = adapter.settle(makeRequest());
    expect(typeof result.receipt.memo).toBe("string");
    expect(result.receipt.memo.length).toBeGreaterThan(0);
  });

  it("calculates a fee based on amount", () => {
    const adapter = createSimulatedAdapter();
    const result = adapter.settle(makeRequest({ amount: 100 }));
    expect(result.receipt.fee).toBeGreaterThanOrEqual(0);
    expect(result.receipt.fee).toBeLessThan(result.receipt.amount);
  });

  it("handles all action types", () => {
    const adapter = createSimulatedAdapter();
    const actionTypes = [
      "trade_execution", "paid_intel", "permit_filing", "inspection",
      "logistics", "brand_promotion", "negotiation", "sabotage_op",
    ] as const;

    for (const actionType of actionTypes) {
      const result = adapter.settle(makeRequest({ actionType }));
      expect(result.settled).toBe(true);
      expect(result.receipt.actionType).toBe(actionType);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// TESTNET ADAPTER
// ═══════════════════════════════════════════════════════════════

describe("TestnetSettlementAdapter", () => {
  it("reports mode as testnet", () => {
    const adapter = createTestnetAdapter();
    expect(adapter.mode).toBe("testnet");
  });

  it("is not available by default (no keypair configured)", () => {
    const adapter = createTestnetAdapter();
    expect(adapter.isAvailable()).toBe(false);
  });

  it("falls back to a simulated-style receipt when unavailable", () => {
    const adapter = createTestnetAdapter();
    const result = adapter.settle(makeRequest());

    // Should still produce a receipt, but marked as pending/simulated fallback
    expect(result.settled).toBe(true);
    expect(result.receipt).toBeDefined();
    expect(result.receipt.settlementMode).toBe("simulated");
    expect(result.receipt.status).toBe("confirmed");
  });

  it("produces receipts with testnet mode when configured", () => {
    const adapter = createTestnetAdapter({
      sourceSecret: "SCEM5HZTDGVCYOUH3AH7LXNY5NS3EHXOOJBBT2YPGVAXAQXILZW2FFM7",
      horizonUrl: "https://horizon-testnet.stellar.org",
    });
    // Even with config, actual Stellar calls won't run in tests,
    // but the adapter should report testnet mode
    expect(adapter.mode).toBe("testnet");
    expect(adapter.isAvailable()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// ADAPTER ROUTER
// ═══════════════════════════════════════════════════════════════

describe("getSettlementAdapter", () => {
  it("returns simulated adapter for simulated mode", () => {
    const adapter = getSettlementAdapter("simulated");
    expect(adapter.mode).toBe("simulated");
  });

  it("returns testnet adapter for testnet mode", () => {
    const adapter = getSettlementAdapter("testnet");
    expect(adapter.mode).toBe("testnet");
  });

  it("falls back to simulated when testnet is unavailable", () => {
    const adapter = getSettlementAdapter("testnet");
    // Since no keypair is configured, settle should still work via fallback
    const result = adapter.settle(makeRequest());
    expect(result.settled).toBe(true);
    expect(result.receipt).toBeDefined();
  });
});
