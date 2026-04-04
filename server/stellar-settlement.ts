import * as StellarSdk from "@stellar/stellar-sdk";

// ═══════════════════════════════════════════════════════════════
// STELLAR SETTLEMENT SERVICE
// Server-side service for real Stellar testnet transactions.
// Manages a testnet wallet, builds transactions, and submits
// them to Horizon. Falls back to simulated receipts on failure.
// ═══════════════════════════════════════════════════════════════

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const EXPLORER_BASE = "https://stellar.expert/explorer/testnet/tx";

// Action types that have a real Stellar execution path
const TESTNET_READY_ACTIONS = new Set([
  "paid_intel",
  "trade_execution",
  "permit_filing",
  "logistics",
]);

export interface StellarSettleRequest {
  actionType: string;
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  agentId: string;
  districtId: string;
  missionId: string;
  success: boolean;
  day: number;
}

export interface StellarSettlementReceipt {
  receiptId: string;
  timestamp: number;
  settlementMode: "simulated" | "testnet";
  amount: number;
  fee: number;
  actionType: string;
  counterpartyId: string;
  counterpartyName: string;
  status: "confirmed" | "pending" | "failed";
  stellarTxId?: string;
  explorerUrl?: string;
  memo: string;
  sourceAccount?: string;
  destinationAccount?: string;
  x402Flow?: { type: string; label: string }[];
}

export interface StellarSettleResult {
  settled: boolean;
  receipt: StellarSettlementReceipt;
}

interface ServiceConfig {
  sourceSecret?: string;
  horizonUrl?: string;
}

let receiptCounter = 0;

function generateReceiptId(prefix: string): string {
  receiptCounter++;
  return `${prefix}-${Date.now().toString(36)}-${receiptCounter.toString(36).padStart(4, "0")}`;
}

const SETTLEMENT_MEMOS: Record<string, string[]> = {
  paid_intel: [
    "Intel fee deposited in the informant's suspiciously clean jar.",
    "Payment slid across the table. Whisper received.",
    "Micropayment confirmed. Rumor quality: TBD.",
  ],
  trade_execution: [
    "Goods exchanged. Handshake confirmed. Fingers counted.",
    "Trade settled. Both parties equally suspicious.",
  ],
  permit_filing: [
    "Filing fee accepted. Permit stamped with unnecessary vigor.",
    "Bureaucratic tribute paid. Form 7B-Q processed.",
  ],
  logistics: [
    "Shipping fee confirmed. Gerald the mule has been briefed.",
    "Freight charge settled. Cargo insurance: 'acts of parrot' excluded.",
  ],
  inspection: ["Inspection fee logged. The inspector adjusted their monocle."],
  brand_promotion: ["Campaign budget disbursed. Volume knob set to 11."],
  negotiation: ["Negotiation retainer paid. Eye contact has commenced."],
  sabotage_op: ["Discreet payment transferred. No receipt exists. Except this one."],
};

function pickMemo(actionType: string): string {
  const memos = SETTLEMENT_MEMOS[actionType] || ["Transaction processed."];
  return memos[Math.floor(Math.random() * memos.length)];
}

export class StellarSettlementService {
  private keypair: StellarSdk.Keypair;
  private horizonUrl: string;
  private server: StellarSdk.Horizon.Server;
  private funded: boolean = false;
  private counterpartyKeys: Map<string, StellarSdk.Keypair> = new Map();

  constructor(config?: ServiceConfig) {
    if (config?.sourceSecret) {
      this.keypair = StellarSdk.Keypair.fromSecret(config.sourceSecret);
    } else {
      this.keypair = StellarSdk.Keypair.random();
    }
    this.horizonUrl = config?.horizonUrl ?? HORIZON_TESTNET;
    this.server = new StellarSdk.Horizon.Server(this.horizonUrl);
  }

  getWalletInfo() {
    return {
      publicKey: this.keypair.publicKey(),
      network: "testnet" as const,
      funded: this.funded,
      horizonUrl: this.horizonUrl,
    };
  }

  /**
   * Get a deterministic testnet address for a counterparty.
   * Uses the counterparty ID as a seed modifier so the same
   * counterparty always gets the same address within a session.
   */
  getCounterpartyAddress(counterpartyId: string): string {
    if (!this.counterpartyKeys.has(counterpartyId)) {
      // Generate a deterministic-ish keypair for this counterparty
      // In a real system, counterparties would have their own registered addresses
      const seed = counterpartyId + "-velvet-ledger-bazaar";
      // Use a hash-like approach: create from a padded seed
      const seedBytes = new Uint8Array(32);
      for (let i = 0; i < seed.length && i < 32; i++) {
        seedBytes[i] = seed.charCodeAt(i);
      }
      const kp = StellarSdk.Keypair.fromRawEd25519Seed(Buffer.from(seedBytes));
      this.counterpartyKeys.set(counterpartyId, kp);
    }
    return this.counterpartyKeys.get(counterpartyId)!.publicKey();
  }

  /**
   * Fund the wallet via Stellar testnet friendbot.
   */
  async fundWallet(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        `${FRIENDBOT_URL}?addr=${encodeURIComponent(this.keypair.publicKey())}`
      );

      if (response.ok) {
        this.funded = true;
        return {
          success: true,
          message: `Wallet ${this.keypair.publicKey()} funded on testnet`,
        };
      }

      const body = await response.text();
      // Friendbot returns 400 if already funded — that's fine
      if (body.includes("createAccountAlreadyExist")) {
        this.funded = true;
        return {
          success: true,
          message: `Wallet already funded on testnet`,
        };
      }

      return {
        success: false,
        message: `Friendbot returned ${response.status}: ${body.slice(0, 200)}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Friendbot request failed: ${err.message}`,
      };
    }
  }

  /**
   * Settle an action step. For testnet-ready actions with a funded wallet,
   * builds and submits a real Stellar transaction. Otherwise falls back
   * to a simulated receipt.
   */
  async settle(request: StellarSettleRequest): Promise<StellarSettleResult> {
    const isTestnetReady = TESTNET_READY_ACTIONS.has(request.actionType);

    // If not funded or not a testnet-ready action, return simulated
    if (!this.funded || !isTestnetReady) {
      return this.simulatedReceipt(request);
    }

    // Attempt real Stellar transaction
    try {
      return await this.executeTestnetPayment(request);
    } catch (err: any) {
      console.error(`Stellar settlement failed, falling back to simulated: ${err.message}`);
      return this.simulatedReceipt(request, `[Fallback] ${err.message}`);
    }
  }

  /**
   * Ensure a counterparty account exists on testnet.
   * Uses createAccount if the destination doesn't exist yet.
   */
  private async ensureCounterpartyAccount(destinationKey: string): Promise<boolean> {
    try {
      await this.server.loadAccount(destinationKey);
      return true; // account already exists
    } catch {
      // Account doesn't exist — create it with a small starting balance
      try {
        const sourceAccount = await this.server.loadAccount(this.keypair.publicKey());
        const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
          .addOperation(
            StellarSdk.Operation.createAccount({
              destination: destinationKey,
              startingBalance: "2", // minimum 1 XLM + buffer
            })
          )
          .addMemo(StellarSdk.Memo.text("VLB:counterparty:init"))
          .setTimeout(30)
          .build();

        tx.sign(this.keypair);
        await this.server.submitTransaction(tx);
        return true;
      } catch (err: any) {
        console.error(`Failed to create counterparty account: ${err.message}`);
        return false;
      }
    }
  }

  /**
   * Execute a real Stellar testnet payment for an action step.
   */
  private async executeTestnetPayment(request: StellarSettleRequest): Promise<StellarSettleResult> {
    const destinationKey = this.getCounterpartyAddress(request.counterpartyId);

    // Ensure the counterparty account exists on testnet
    const accountReady = await this.ensureCounterpartyAccount(destinationKey);
    if (!accountReady) {
      throw new Error("Could not create counterparty account on testnet");
    }

    // Convert game amount to XLM (1 game ¤ = 0.1 XLM on testnet)
    const xlmAmount = (request.amount * 0.1).toFixed(7);

    // Load source account (re-load after possible createAccount)
    const sourceAccount = await this.server.loadAccount(this.keypair.publicKey());

    // Build the payment transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destinationKey,
          asset: StellarSdk.Asset.native(),
          amount: xlmAmount,
        })
      )
      .addMemo(
        StellarSdk.Memo.text(
          `VLB:${request.actionType}:${request.counterpartyId}`.slice(0, 28)
        )
      )
      .setTimeout(30)
      .build();

    // Sign
    transaction.sign(this.keypair);

    // Submit
    const result = await this.server.submitTransaction(transaction);
    const txHash = result.hash;

    return {
      settled: true,
      receipt: {
        receiptId: generateReceiptId("STL"),
        timestamp: Date.now(),
        settlementMode: "testnet",
        amount: request.amount,
        fee: 1, // Stellar base fee is negligible, use 1¤ game fee
        actionType: request.actionType,
        counterpartyId: request.counterpartyId,
        counterpartyName: request.counterpartyName,
        status: request.success ? "confirmed" : "failed",
        stellarTxId: txHash,
        explorerUrl: `${EXPLORER_BASE}/${txHash}`,
        memo: `[Testnet] ${pickMemo(request.actionType)}`,
        sourceAccount: this.keypair.publicKey(),
        destinationAccount: destinationKey,
      },
    };
  }

  /**
   * Produce a simulated receipt (used as fallback).
   */
  private simulatedReceipt(
    request: StellarSettleRequest,
    errorNote?: string,
  ): StellarSettleResult {
    const fee = Math.round(request.amount * 0.02);
    return {
      settled: true,
      receipt: {
        receiptId: generateReceiptId("SIM"),
        timestamp: Date.now(),
        settlementMode: "simulated",
        amount: request.amount,
        fee,
        actionType: request.actionType,
        counterpartyId: request.counterpartyId,
        counterpartyName: request.counterpartyName,
        status: request.success ? "confirmed" : "failed",
        memo: errorNote ?? pickMemo(request.actionType),
      },
    };
  }

  /** Test helper — set funded state without hitting friendbot */
  _setFundedForTest(funded: boolean) {
    this.funded = funded;
  }
}
