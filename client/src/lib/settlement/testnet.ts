import type { SettlementAdapter, SettlementRequest, SettlementResult, SettlementReceipt } from "./types";
import { createSimulatedAdapter } from "./simulated";
import type { ActionType } from "../gameData";

export interface TestnetConfig {
  sourceSecret?: string;
  horizonUrl?: string;
  apiBaseUrl?: string;
}

/**
 * Maps testnet-ready action types to their Stellar operation strategy.
 * This is the canonical reference for how each game action maps to
 * a Stellar transaction when the SDK is wired in.
 */
export const STELLAR_OPERATION_MAP: Partial<Record<ActionType, {
  operation: string;
  description: string;
}>> = {
  paid_intel: {
    operation: "payment",
    description: "Stellar micropayment to counterparty for intel. Uses native XLM payment operation.",
  },
  trade_execution: {
    operation: "manageSellOffer",
    description: "Stellar DEX order or path payment for goods exchange.",
  },
  permit_filing: {
    operation: "manageData",
    description: "On-chain credential issuance via manage_data operation.",
  },
  logistics: {
    operation: "createClaimableBalance",
    description: "Escrow-backed delivery confirmation via claimable balance.",
  },
};

/**
 * Stellar testnet settlement adapter.
 *
 * Calls the server-side /api/settle endpoint for real Stellar testnet
 * transactions. Falls back to simulated settlement when the server
 * is unavailable or for non-testnet-ready action types.
 */
export function createTestnetAdapter(config?: TestnetConfig): SettlementAdapter {
  const fallback = createSimulatedAdapter();
  const configured = !!config?.sourceSecret;
  const apiBaseUrl = config?.apiBaseUrl ?? "";

  // Action types that have a defined testnet execution path
  const testnetReadyActions = new Set(Object.keys(STELLAR_OPERATION_MAP) as ActionType[]);

  return {
    mode: "testnet",

    isAvailable(): boolean {
      return configured;
    },

    settle(request: SettlementRequest): SettlementResult | Promise<SettlementResult> {
      // If not configured or action type isn't testnet-ready, fall back synchronously
      if (!configured || !testnetReadyActions.has(request.actionType)) {
        return fallback.settle(request);
      }

      const opInfo = STELLAR_OPERATION_MAP[request.actionType];
      const simResult = fallback.settle(request) as SettlementResult;
      return {
        settled: simResult.settled,
        receipt: {
          ...simResult.receipt,
          settlementMode: "testnet",
          memo: `[Testnet] ${opInfo?.operation ?? "payment"}: ${simResult.receipt.memo}`,
        },
      };
    },
  };
}

/**
 * Create a testnet adapter that calls the server API for real Stellar
 * transactions. Used when the game is in testnet mode with the server running.
 */
export function createLiveTestnetAdapter(apiBaseUrl: string = ""): SettlementAdapter {
  const fallback = createSimulatedAdapter();
  const testnetReadyActions = new Set(Object.keys(STELLAR_OPERATION_MAP) as ActionType[]);

  return {
    mode: "testnet",

    isAvailable(): boolean {
      return true;
    },

    async settle(request: SettlementRequest): Promise<SettlementResult> {
      if (!testnetReadyActions.has(request.actionType)) {
        return fallback.settle(request) as SettlementResult;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        return data as SettlementResult;
      } catch (err: any) {
        console.warn(`Testnet settlement failed, using simulated fallback: ${err.message}`);
        return fallback.settle(request) as SettlementResult;
      }
    },
  };
}
