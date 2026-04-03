import type { ActionType, SettlementMode } from "../gameData";

/**
 * What the game engine asks the settlement layer to execute.
 * The engine has already decided success/failure and cost —
 * the adapter records or executes the financial side.
 */
export interface SettlementRequest {
  actionType: ActionType;
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  agentId: string;
  districtId: string;
  missionId: string;
  success: boolean;
  day: number;
}

/**
 * A durable record of a settled action step.
 * In simulated mode these are generated locally.
 * In testnet mode they include a Stellar tx hash.
 */
export interface X402Step {
  type: "request" | "response_402" | "payment" | "mpp_verify" | "request_with_proof" | "response_200";
  label: string;
  detail: string;
}

export interface SettlementReceipt {
  receiptId: string;
  timestamp: number;
  settlementMode: SettlementMode;
  amount: number;
  fee: number;
  actionType: ActionType;
  counterpartyId: string;
  counterpartyName: string;
  status: "confirmed" | "pending" | "failed";
  stellarTxId?: string;
  explorerUrl?: string;
  sourceAccount?: string;
  destinationAccount?: string;
  memo: string;
  x402Flow?: X402Step[]; // Protocol exchange steps for x402 actions
}

/** What the adapter returns after settling an action. */
export interface SettlementResult {
  settled: boolean;
  receipt: SettlementReceipt;
}

/** The contract any settlement backend must implement. */
export interface SettlementAdapter {
  mode: SettlementMode;
  settle(request: SettlementRequest): SettlementResult | Promise<SettlementResult>;
  isAvailable(): boolean;
}
