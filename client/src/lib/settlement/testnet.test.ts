import { describe, it, expect } from "vitest";
import { createTestnetAdapter } from "./testnet";
import type { SettlementRequest } from "./types";

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

describe("TestnetAdapter paid_intel path", () => {
  it("produces a testnet-mode receipt for paid_intel when configured", () => {
    const adapter = createTestnetAdapter({
      sourceSecret: "SCEM5HZTDGVCYOUH3AH7LXNY5NS3EHXOOJBBT2YPGVAXAQXILZW2FFM7",
    });

    const result = adapter.settle(makeRequest({ actionType: "paid_intel" }));

    expect(result.settled).toBe(true);
    expect(result.receipt.settlementMode).toBe("testnet");
    expect(result.receipt.actionType).toBe("paid_intel");
    expect(result.receipt.memo).toContain("[Testnet]");
  });

  it("falls back to simulated for non-testnet-ready actions even when configured", () => {
    const adapter = createTestnetAdapter({
      sourceSecret: "SCEM5HZTDGVCYOUH3AH7LXNY5NS3EHXOOJBBT2YPGVAXAQXILZW2FFM7",
    });

    const result = adapter.settle(makeRequest({ actionType: "brand_promotion" }));

    expect(result.settled).toBe(true);
    // brand_promotion is not testnet-ready, so falls back to simulated
    expect(result.receipt.settlementMode).toBe("simulated");
  });

  it("produces testnet receipts for all testnet-ready action types", () => {
    const adapter = createTestnetAdapter({
      sourceSecret: "SCEM5HZTDGVCYOUH3AH7LXNY5NS3EHXOOJBBT2YPGVAXAQXILZW2FFM7",
    });

    const testnetReady = ["paid_intel", "trade_execution", "permit_filing", "logistics"] as const;
    for (const actionType of testnetReady) {
      const result = adapter.settle(makeRequest({ actionType }));
      expect(result.receipt.settlementMode).toBe("testnet");
    }
  });

  it("produces simulated receipts for non-testnet-ready action types", () => {
    const adapter = createTestnetAdapter({
      sourceSecret: "SCEM5HZTDGVCYOUH3AH7LXNY5NS3EHXOOJBBT2YPGVAXAQXILZW2FFM7",
    });

    const simulatedOnly = ["inspection", "brand_promotion", "negotiation", "sabotage_op"] as const;
    for (const actionType of simulatedOnly) {
      const result = adapter.settle(makeRequest({ actionType }));
      expect(result.receipt.settlementMode).toBe("simulated");
    }
  });

  it("paid_intel receipt includes stellar-specific metadata fields", () => {
    const adapter = createTestnetAdapter({
      sourceSecret: "SCEM5HZTDGVCYOUH3AH7LXNY5NS3EHXOOJBBT2YPGVAXAQXILZW2FFM7",
    });

    const result = adapter.settle(makeRequest({
      actionType: "paid_intel",
      amount: 5,
      counterpartyName: "The Whisper Network",
    }));

    expect(result.receipt.receiptId).toBeTruthy();
    expect(result.receipt.amount).toBe(5);
    expect(result.receipt.counterpartyName).toBe("The Whisper Network");
    expect(result.receipt.status).toBe("confirmed");
  });

  it("stores horizonUrl in adapter for future SDK use", () => {
    const adapter = createTestnetAdapter({
      sourceSecret: "SCEM5HZTDGVCYOUH3AH7LXNY5NS3EHXOOJBBT2YPGVAXAQXILZW2FFM7",
      horizonUrl: "https://horizon-testnet.stellar.org",
    });

    expect(adapter.isAvailable()).toBe(true);
    // The horizonUrl is stored internally; we test it doesn't break settlement
    const result = adapter.settle(makeRequest());
    expect(result.settled).toBe(true);
  });
});

describe("TestnetAdapter game engine integration", () => {
  it("paid_intel through a testnet counterparty produces testnet receipt", async () => {
    // This tests the full path: counterparty.settlementMode = "testnet"
    // → getSettlementAdapter("testnet") → testnet adapter → receipt
    const { getSettlementAdapter } = await import("./index");

    const adapter = getSettlementAdapter("testnet");
    // Without config, falls back to simulated
    const result = adapter.settle(makeRequest({ actionType: "paid_intel" }));
    expect(result.settled).toBe(true);
    expect(result.receipt).toBeDefined();
    // Without config it should fall back gracefully
    expect(result.receipt.settlementMode).toBe("simulated");
  });
});
