// ═══════════════════════════════════════════════════════════════
// x402 / MPP PROTOCOL SIMULATION
//
// Simulates the x402 (HTTP 402 Payment Required) and MPP
// (Micro Payment Proof) protocol flow for game actions.
// When Stellar testnet is active, the payment step is real.
// When simulated, the entire flow is narrated but fictional.
//
// This makes the game an educational demo of how x402 and MPP
// work on Stellar, while keeping it playable without a network.
// ═══════════════════════════════════════════════════════════════

import type { ActionType } from "../client/src/lib/gameData";

/**
 * Maps game action types to x402 API endpoints and descriptions.
 * Each action type has a natural x402 interpretation.
 */
export const X402_ACTION_MAP: Partial<Record<string, {
  endpoint: string;
  method: string;
  description: string;
  paymentType: string; // How the payment maps to Stellar
  mppVerification: string; // What gets verified
}>> = {
  paid_intel: {
    endpoint: "/intel/market-rumors",
    method: "GET",
    description: "Request market intelligence from counterparty API",
    paymentType: "Stellar native payment (XLM micropayment)",
    mppVerification: "Transaction hash proves payment before intel delivery",
  },
  trade_execution: {
    endpoint: "/trade/execute",
    method: "POST",
    description: "Execute asset exchange via counterparty trading desk",
    paymentType: "Stellar DEX path payment or direct offer",
    mppVerification: "Trade confirmation hash verifies asset transfer",
  },
  permit_filing: {
    endpoint: "/permits/file",
    method: "POST",
    description: "Submit permit application with filing fee",
    paymentType: "Stellar manage_data for credential + payment for fee",
    mppVerification: "Filing receipt hash proves fee payment and credential issuance",
  },
  logistics: {
    endpoint: "/logistics/ship",
    method: "POST",
    description: "Request goods shipment with escrow deposit",
    paymentType: "Stellar claimable balance as escrow",
    mppVerification: "Escrow creation hash proves funds are locked for delivery",
  },
};

export interface X402ProtocolStep {
  type: "request" | "response_402" | "payment" | "mpp_verify" | "request_with_proof" | "response_200";
  label: string;
  detail: string;
  stellarOperation?: string;
}

/**
 * Generate the x402/MPP protocol exchange steps for a given action.
 * These are displayed in the terminal to show how the protocol works.
 */
export function generateX402Flow(
  actionType: string,
  counterpartyName: string,
  amount: number,
  destination: string,
  memo: string,
  txHash?: string,
  isRealTransaction: boolean = false,
): X402ProtocolStep[] {
  const mapping = X402_ACTION_MAP[actionType];
  if (!mapping) return []; // Non-x402 action types

  const xlmAmount = (amount * 0.1).toFixed(2);
  const steps: X402ProtocolStep[] = [];

  // Step 1: Initial request
  steps.push({
    type: "request",
    label: `→ ${mapping.method} ${mapping.endpoint}`,
    detail: mapping.description,
  });

  // Step 2: 402 Payment Required response
  steps.push({
    type: "response_402",
    label: "← 402 Payment Required",
    detail: `Amount: ${xlmAmount} XLM | Destination: ${destination.slice(0, 12)}... | Memo: ${memo}`,
  });

  // Step 3: Stellar payment
  steps.push({
    type: "payment",
    label: isRealTransaction
      ? "→ Stellar payment submitted to testnet..."
      : "→ Stellar payment (simulated)...",
    detail: mapping.paymentType,
    stellarOperation: isRealTransaction ? "payment" : undefined,
  });

  // Step 4: MPP verification
  steps.push({
    type: "mpp_verify",
    label: txHash
      ? `← MPP: Payment proof verified ✓ (${txHash.slice(0, 16)}...)`
      : "← MPP: Payment proof verified ✓",
    detail: mapping.mppVerification,
  });

  // Step 5: Authenticated request with proof
  steps.push({
    type: "request_with_proof",
    label: `→ ${mapping.method} ${mapping.endpoint}`,
    detail: txHash
      ? `X-Payment-Proof: ${txHash.slice(0, 24)}...`
      : "X-Payment-Proof: <simulated>",
  });

  // Step 6: Success response
  steps.push({
    type: "response_200",
    label: "← 200 OK",
    detail: "Service delivered. Receipt issued.",
  });

  return steps;
}
