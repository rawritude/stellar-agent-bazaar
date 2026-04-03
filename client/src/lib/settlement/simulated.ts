import type { SettlementAdapter, SettlementRequest, SettlementResult, SettlementReceipt, X402Step } from "./types";
import type { ActionType } from "../gameData";

let receiptCounter = 0;

function generateReceiptId(): string {
  receiptCounter++;
  return `SIM-${Date.now().toString(36)}-${receiptCounter.toString(36).padStart(4, "0")}`;
}

const SETTLEMENT_MEMOS: Record<ActionType, string[]> = {
  trade_execution: [
    "Goods exchanged. Handshake confirmed. Fingers counted.",
    "Trade settled. Both parties equally suspicious.",
    "Exchange complete. The merchant winked ominously.",
  ],
  paid_intel: [
    "Intel fee deposited in the informant's suspiciously clean jar.",
    "Payment slid across the table. Whisper received.",
    "Micropayment confirmed. Rumor quality: TBD.",
  ],
  permit_filing: [
    "Filing fee accepted. Permit stamped with unnecessary vigor.",
    "Bureaucratic tribute paid. Form 7B-Q processed.",
    "Payment absorbed by the permit desk's petty cash vortex.",
  ],
  inspection: [
    "Inspection fee logged. The inspector adjusted their monocle.",
    "Quality audit charge deducted. Score pending.",
    "Assessment fee noted. The 47-point scale awaits.",
  ],
  logistics: [
    "Shipping fee confirmed. Gerald the mule has been briefed.",
    "Freight charge settled. Cargo insurance: 'acts of parrot' excluded.",
    "Logistics payment cleared. Estimated delivery: optimistic.",
  ],
  brand_promotion: [
    "Campaign budget disbursed. Volume knob set to 11.",
    "Promotion spend confirmed. The criers are warming up.",
    "Marketing fee settled. Brand visibility: imminent.",
  ],
  negotiation: [
    "Negotiation retainer paid. Eye contact has commenced.",
    "Haggling session fee settled. Uncomfortable silences included.",
    "Mediation cost absorbed. Both parties look slightly unhappy (good sign).",
  ],
  sabotage_op: [
    "Discreet payment transferred. No receipt exists. Except this one.",
    "Covert ops fee settled via note slid under a door.",
    "Shadow budget deployed. Plausible deniability: intact.",
  ],
};

function pickMemo(actionType: ActionType): string {
  const memos = SETTLEMENT_MEMOS[actionType];
  return memos[Math.floor(Math.random() * memos.length)];
}

// x402-eligible action types and their API mappings
const X402_ENDPOINTS: Partial<Record<ActionType, { endpoint: string; method: string }>> = {
  paid_intel: { endpoint: "/intel/market-rumors", method: "GET" },
  trade_execution: { endpoint: "/trade/execute", method: "POST" },
  permit_filing: { endpoint: "/permits/file", method: "POST" },
  logistics: { endpoint: "/logistics/ship", method: "POST" },
};

function generateX402Flow(request: SettlementRequest): X402Step[] | undefined {
  const mapping = X402_ENDPOINTS[request.actionType];
  if (!mapping) return undefined;

  const xlmAmount = (request.amount * 0.1).toFixed(2);

  return [
    { type: "request", label: `→ ${mapping.method} ${mapping.endpoint}`, detail: "" },
    { type: "response_402", label: `← 402 Payment Required (${xlmAmount} XLM)`, detail: "" },
    { type: "payment", label: "→ Stellar payment (simulated)...", detail: "" },
    { type: "mpp_verify", label: "← MPP: Payment proof verified ✓", detail: "" },
    { type: "request_with_proof", label: `→ ${mapping.method} ${mapping.endpoint}`, detail: "X-Payment-Proof: <simulated>" },
    { type: "response_200", label: "← 200 OK — Service delivered", detail: "" },
  ];
}

export function createSimulatedAdapter(): SettlementAdapter {
  return {
    mode: "simulated",

    isAvailable(): boolean {
      return true;
    },

    settle(request: SettlementRequest): SettlementResult {
      const fee = Math.round(request.amount * 0.02);
      const receipt: SettlementReceipt = {
        receiptId: generateReceiptId(),
        timestamp: Date.now(),
        settlementMode: "simulated",
        amount: request.amount,
        fee,
        actionType: request.actionType,
        counterpartyId: request.counterpartyId,
        counterpartyName: request.counterpartyName,
        status: request.success ? "confirmed" : "failed",
        memo: pickMemo(request.actionType),
        x402Flow: generateX402Flow(request),
      };

      return { settled: true, receipt };
    },
  };
}
