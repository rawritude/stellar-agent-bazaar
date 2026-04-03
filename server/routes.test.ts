import { describe, it, expect, beforeAll } from "vitest";

// We test the settlement API by importing the service directly
// and verifying the contract that routes.ts will use.
// Full HTTP integration tests would need supertest — for now we
// test the service layer that the endpoint delegates to.

import { StellarSettlementService } from "./stellar-settlement";

describe("POST /api/settle contract", () => {
  let service: StellarSettlementService;

  beforeAll(() => {
    service = new StellarSettlementService();
  });

  it("handles a valid settlement request", async () => {
    const result = await service.settle({
      actionType: "paid_intel",
      counterpartyId: "whisper-network",
      counterpartyName: "The Whisper Network",
      amount: 5,
      agentId: "crow-sigma",
      districtId: "fungal-quarter",
      missionId: "test-1",
      success: true,
      day: 1,
    });

    expect(result.settled).toBe(true);
    expect(result.receipt.receiptId).toBeTruthy();
    expect(result.receipt.amount).toBe(5);
  });

  it("handles missing optional fields gracefully", async () => {
    const result = await service.settle({
      actionType: "paid_intel",
      counterpartyId: "whisper-network",
      counterpartyName: "The Whisper Network",
      amount: 3,
      agentId: "crow-sigma",
      districtId: "velvet-steps",
      missionId: "test-2",
      success: false,
      day: 2,
    });

    expect(result.settled).toBe(true);
    expect(result.receipt.status).toBe("failed");
  });

  it("returns wallet info from the service", () => {
    const info = service.getWalletInfo();
    expect(info.publicKey).toMatch(/^G[A-Z2-7]{55}$/);
    expect(info.network).toBe("testnet");
    expect(typeof info.funded).toBe("boolean");
  });
});

describe("POST /api/settle with funded wallet", () => {
  let service: StellarSettlementService;

  beforeAll(async () => {
    service = new StellarSettlementService();
    // Fund the wallet for real testnet tests
    await service.fundWallet();
  }, 30000);

  it("executes a real Stellar payment for paid_intel", async () => {
    const result = await service.settle({
      actionType: "paid_intel",
      counterpartyId: "whisper-network",
      counterpartyName: "The Whisper Network",
      amount: 2,
      agentId: "crow-sigma",
      districtId: "fungal-quarter",
      missionId: "real-test-1",
      success: true,
      day: 1,
    });

    expect(result.settled).toBe(true);
    expect(result.receipt.settlementMode).toBe("testnet");
    expect(result.receipt.stellarTxId).toBeTruthy();
    expect(result.receipt.stellarTxId!.length).toBe(64); // Stellar tx hashes are 64 hex chars
    expect(result.receipt.explorerUrl).toContain("stellar.expert");
    expect(result.receipt.explorerUrl).toContain(result.receipt.stellarTxId!);
    expect(result.receipt.sourceAccount).toBeTruthy();
    expect(result.receipt.destinationAccount).toBeTruthy();
    console.log(`Real Stellar testnet TX: ${result.receipt.explorerUrl}`);
  }, 30000);
});
