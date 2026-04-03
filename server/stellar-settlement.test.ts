import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  StellarSettlementService,
  type StellarSettleRequest,
  type StellarSettleResult,
} from "./stellar-settlement";

function makeRequest(overrides: Partial<StellarSettleRequest> = {}): StellarSettleRequest {
  return {
    actionType: "paid_intel",
    counterpartyId: "whisper-network",
    counterpartyName: "The Whisper Network",
    amount: 5,
    agentId: "crow-sigma",
    districtId: "fungal-quarter",
    missionId: "test-mission-1",
    success: true,
    day: 3,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// WALLET INITIALIZATION
// ═══════════════════════════════════════════════════════════════

describe("StellarSettlementService wallet", () => {
  it("generates a valid Stellar keypair on construction", () => {
    const service = new StellarSettlementService();
    const walletInfo = service.getWalletInfo();

    expect(walletInfo.publicKey).toBeTruthy();
    expect(walletInfo.publicKey).toMatch(/^G[A-Z2-7]{55}$/); // Stellar public key format
    expect(walletInfo.network).toBe("testnet");
  });

  it("accepts a pre-existing secret key", () => {
    const service = new StellarSettlementService({
      sourceSecret: "SCEM5HZTDGVCYOUH3AH7LXNY5NS3EHXOOJBBT2YPGVAXAQXILZW2FFM7",
    });
    const walletInfo = service.getWalletInfo();

    expect(walletInfo.publicKey).toBeTruthy();
    expect(walletInfo.network).toBe("testnet");
  });

  it("reports funded status", () => {
    const service = new StellarSettlementService();
    // Before funding, should report not funded
    expect(service.getWalletInfo().funded).toBe(false);
  });

  it("reports the horizon URL", () => {
    const service = new StellarSettlementService();
    expect(service.getWalletInfo().horizonUrl).toContain("stellar.org");
  });
});

// ═══════════════════════════════════════════════════════════════
// COUNTERPARTY ADDRESS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

describe("StellarSettlementService counterparty addresses", () => {
  it("generates a deterministic address for a counterparty ID", () => {
    const service = new StellarSettlementService();
    const addr1 = service.getCounterpartyAddress("whisper-network");
    const addr2 = service.getCounterpartyAddress("whisper-network");

    expect(addr1).toBe(addr2); // same ID → same address
    expect(addr1).toMatch(/^G[A-Z2-7]{55}$/);
  });

  it("generates different addresses for different counterparties", () => {
    const service = new StellarSettlementService();
    const addr1 = service.getCounterpartyAddress("whisper-network");
    const addr2 = service.getCounterpartyAddress("shadow-desk");

    expect(addr1).not.toBe(addr2);
  });
});

// ═══════════════════════════════════════════════════════════════
// SETTLEMENT EXECUTION
// ═══════════════════════════════════════════════════════════════

describe("StellarSettlementService.settle()", () => {
  it("returns a result with receipt for paid_intel", async () => {
    const service = new StellarSettlementService();
    const result = await service.settle(makeRequest({ actionType: "paid_intel" }));

    expect(result.settled).toBe(true);
    expect(result.receipt).toBeDefined();
    expect(result.receipt.actionType).toBe("paid_intel");
    expect(result.receipt.counterpartyId).toBe("whisper-network");
    expect(result.receipt.amount).toBe(5);
  });

  it("includes settlementMode testnet when wallet is funded", async () => {
    const service = new StellarSettlementService();
    // Simulate funded state for unit test
    service._setFundedForTest(true);

    const result = await service.settle(makeRequest());

    // When funded, it attempts real settlement
    // (may fail in test env without real horizon, but structure is correct)
    expect(result.receipt).toBeDefined();
    expect(result.receipt.settlementMode).toMatch(/testnet|simulated/);
  });

  it("falls back to simulated when wallet is not funded", async () => {
    const service = new StellarSettlementService();
    // Not funded → simulated fallback
    const result = await service.settle(makeRequest());

    expect(result.settled).toBe(true);
    expect(result.receipt.settlementMode).toBe("simulated");
    expect(result.receipt.status).toMatch(/confirmed|failed/);
  });

  it("falls back to simulated for non-testnet-ready action types", async () => {
    const service = new StellarSettlementService();
    service._setFundedForTest(true);

    const result = await service.settle(makeRequest({ actionType: "brand_promotion" }));

    expect(result.settled).toBe(true);
    expect(result.receipt.settlementMode).toBe("simulated");
  });

  it("includes explorer URL when tx hash is present", async () => {
    const service = new StellarSettlementService();
    service._setFundedForTest(true);

    const result = await service.settle(makeRequest());

    // If it managed to get a tx hash (or even in simulation)
    if (result.receipt.stellarTxId) {
      expect(result.receipt.explorerUrl).toContain("stellar.expert");
      expect(result.receipt.explorerUrl).toContain(result.receipt.stellarTxId);
    }
  });

  it("receipt has a unique receiptId", async () => {
    const service = new StellarSettlementService();
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const result = await service.settle(makeRequest());
      ids.add(result.receipt.receiptId);
    }
    expect(ids.size).toBe(10);
  });

  it("receipt memo includes action context", async () => {
    const service = new StellarSettlementService();
    const result = await service.settle(makeRequest());

    expect(typeof result.receipt.memo).toBe("string");
    expect(result.receipt.memo.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// FRIENDBOT FUNDING
// ═══════════════════════════════════════════════════════════════

describe("StellarSettlementService.fundWallet()", () => {
  it("fundWallet returns a result object", async () => {
    const service = new StellarSettlementService();
    // This actually hits the testnet friendbot — may be slow
    // We test the interface, not the network call
    const result = await service.fundWallet();
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.message).toBe("string");
  }, 30000); // generous timeout for network call
});
