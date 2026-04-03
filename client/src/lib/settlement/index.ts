import type { SettlementMode } from "../gameData";
import type { SettlementAdapter } from "./types";
import { createSimulatedAdapter } from "./simulated";
import { createTestnetAdapter } from "./testnet";

export type { SettlementAdapter, SettlementRequest, SettlementReceipt, SettlementResult } from "./types";
export { createSimulatedAdapter } from "./simulated";
export { createTestnetAdapter, createLiveTestnetAdapter } from "./testnet";

/**
 * Returns the appropriate settlement adapter for the given mode.
 * Testnet adapter falls back to simulated behavior when unconfigured.
 */
export function getSettlementAdapter(mode: SettlementMode): SettlementAdapter {
  switch (mode) {
    case "testnet":
      return createTestnetAdapter();
    case "simulated":
    default:
      return createSimulatedAdapter();
  }
}
