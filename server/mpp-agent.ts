// ═══════════════════════════════════════════════════════════════
// MPP AGENT CLIENT — Server-side agent that negotiates with
// counterparty services via the MPP protocol.
//
// Flow: Agent requests service → gets 402 → decides to pay →
//       signs Stellar payment → verifies proof → gets result
//
// Both agent and counterparty decisions can be AI-powered.
// ═══════════════════════════════════════════════════════════════

import { Keypair } from "@stellar/stellar-sdk";
import { Mppx, stellar } from "@stellar/mpp/charge/client";
import { XLM_SAC_TESTNET } from "@stellar/mpp";
import { getServicePrice } from "./mpp-services";
import { getAgentWalletService } from "./agent-wallets";
import { AISceneGenerator } from "./ai-engine";

// ── Types ──────────────────────────────────────────────────────

export interface StepContext {
  actionType: string;
  agentId: string;
  agentName: string;
  agentTitle: string;
  agentSpecialty: string;
  agentQuirk: string;
  agentBudget: number;           // remaining budget in game currency
  counterpartyId: string;
  counterpartyName: string;
  counterpartyMood: string;
  counterpartyGreed: number;
  counterpartyTrust: number;
  districtId: string;
  missionId: string;
  day: number;
  playerPubkey: string;
  enableAI: boolean;
}

export interface StepResult {
  success: boolean;
  paid: boolean;
  pricePaid: number;             // XLM amount paid
  gameCost: number;              // game currency equivalent
  txHash?: string;
  explorerUrl?: string;
  serviceData?: string;
  serviceFlavor?: string;
  serviceQuality: number;
  agentReasoning?: string;       // AI-generated reasoning
  counterpartyDialogue?: string; // AI-generated dialogue
  mppExchange: MppExchangeStep[];
}

export interface MppExchangeStep {
  type: "request" | "challenge_402" | "agent_decision" | "payment" | "proof" | "service_delivered" | "walk_away" | "fund";
  label: string;
  detail?: string;
  txHash?: string;
}

// ── Resolve a single action step via real MPP ─────────────────

/**
 * Resolve an action step by making a real MPP request to the
 * counterparty service endpoint.
 *
 * This is the core agentic flow:
 * 1. Check counterparty's price
 * 2. Agent AI decides whether to pay
 * 3. If yes: create MPP client with agent's keypair, make request
 * 4. MPP SDK handles 402 → payment → proof automatically
 * 5. Return the service result + full exchange log
 */
export async function resolveStepViaMpp(
  ctx: StepContext,
  serverBaseUrl: string = "http://localhost:5000",
): Promise<StepResult> {
  const exchange: MppExchangeStep[] = [];

  // 1. Get the expected price
  const expectedPrice = getServicePrice(ctx.actionType, {
    greedFactor: ctx.counterpartyGreed,
    mood: ctx.counterpartyMood,
    trust: ctx.counterpartyTrust,
  });

  const gameCost = Math.round(expectedPrice * 10); // 0.1 XLM = 1 game ¤

  exchange.push({
    type: "request",
    label: `Agent ${ctx.agentName} requests ${ctx.actionType} from ${ctx.counterpartyName}`,
    detail: `Budget remaining: ${ctx.agentBudget}¤`,
  });

  // 2. Check if agent can afford it
  if (gameCost > ctx.agentBudget) {
    exchange.push({
      type: "walk_away",
      label: `${ctx.agentName} can't afford the service (${gameCost}¤ > ${ctx.agentBudget}¤ budget)`,
    });
    return {
      success: false,
      paid: false,
      pricePaid: 0,
      gameCost: 0,
      serviceQuality: 0,
      agentReasoning: "Not enough budget for this service.",
      mppExchange: exchange,
    };
  }

  // 3. Agent AI decides (if enabled)
  let agentReasoning: string | undefined;
  if (ctx.enableAI) {
    // Simplified AI decision — accept if within budget
    agentReasoning = `The price of ${gameCost}¤ is within budget. Proceeding.`;
  }

  exchange.push({
    type: "agent_decision",
    label: `${ctx.agentName} decides to proceed`,
    detail: agentReasoning || `Price ${gameCost}¤ is within budget (${ctx.agentBudget}¤)`,
  });

  // 4. Create MPP client with agent's keypair
  const walletService = getAgentWalletService();
  const agentWallet = await walletService.createAgentWallet(ctx.playerPubkey, ctx.agentId);

  if (!agentWallet.funded) {
    exchange.push({
      type: "walk_away",
      label: `Agent wallet not funded — cannot make payment`,
    });
    return {
      success: false,
      paid: false,
      pricePaid: 0,
      gameCost: 0,
      serviceQuality: 0,
      agentReasoning: "Agent wallet not ready.",
      mppExchange: exchange,
    };
  }

  // Fund agent wallet with RUBY for this mission's budget
  const fundResult = await walletService.fundAgent(agentWallet, ctx.agentBudget);
  if (fundResult.success) {
    exchange.push({
      type: "fund",
      label: `GM funded ${ctx.agentName}'s wallet with ${ctx.agentBudget} RUBY`,
      detail: fundResult.txHash ? `TX: ${fundResult.txHash}` : undefined,
    });
  }

  // 5. Make the MPP request
  try {
    const mppClient = Mppx.create({
      methods: [
        stellar.charge({
          keypair: agentWallet.keypair,
        }),
      ],
    });

    // Wrap fetch to use the MPP client
    const serviceUrl = `${serverBaseUrl}/api/service/${ctx.actionType}`;
    const requestBody = JSON.stringify({
      counterpartyId: ctx.counterpartyId,
      counterpartyName: ctx.counterpartyName,
      agentId: ctx.agentId,
      agentName: ctx.agentName,
      trust: ctx.counterpartyTrust,
      mood: ctx.counterpartyMood,
      greed: ctx.counterpartyGreed,
      budget: ctx.agentBudget,
    });

    exchange.push({
      type: "challenge_402",
      label: `${ctx.counterpartyName} requires payment: ${expectedPrice.toFixed(4)} XLM (~${gameCost}¤)`,
      detail: `402 Payment Required — WWW-Authenticate: stellar-payment`,
    });

    exchange.push({
      type: "payment",
      label: `${ctx.agentName} signs Stellar payment: ${expectedPrice.toFixed(4)} XLM`,
      detail: `${agentWallet.publicKey.slice(0, 12)}... → counterparty`,
    });

    // Make the actual MPP-wrapped fetch
    const response = await mppClient.fetch(serviceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    if (response.ok) {
      const data = await response.json() as any;

      // Extract receipt header
      const receiptHeader = response.headers.get("payment-receipt");

      exchange.push({
        type: "proof",
        label: `Payment verified by ${ctx.counterpartyName}`,
        detail: receiptHeader ? `Receipt: ${receiptHeader.slice(0, 40)}...` : "Proof accepted",
      });

      exchange.push({
        type: "service_delivered",
        label: data.service?.flavor || `${ctx.counterpartyName} delivers ${ctx.actionType}`,
        detail: data.service?.data || "Service completed",
      });

      return {
        success: data.service?.success ?? true,
        paid: true,
        pricePaid: data.price || expectedPrice,
        gameCost,
        txHash: undefined, // MPP SDK handles internally
        explorerUrl: undefined,
        serviceData: data.service?.data,
        serviceFlavor: data.service?.flavor,
        serviceQuality: data.service?.quality ?? 0.5,
        agentReasoning,
        counterpartyDialogue: data.service?.flavor,
        mppExchange: exchange,
      };
    } else {
      // Non-200 response (and not 402 — MPP client handles that)
      const errorText = await response.text();
      exchange.push({
        type: "walk_away",
        label: `Service request failed: ${response.status}`,
        detail: errorText.slice(0, 100),
      });

      return {
        success: false,
        paid: false,
        pricePaid: 0,
        gameCost: 0,
        serviceQuality: 0,
        agentReasoning: `Service returned ${response.status}`,
        mppExchange: exchange,
      };
    }
  } catch (err: any) {
    console.error(`[mpp-agent] Step failed:`, err.message);

    exchange.push({
      type: "walk_away",
      label: `MPP exchange failed: ${err.message}`,
    });

    // Fallback: simulate the step (dice roll)
    const success = Math.random() < 0.6;
    return {
      success,
      paid: false,
      pricePaid: 0,
      gameCost,
      serviceQuality: success ? 0.6 : 0.3,
      agentReasoning: `MPP unavailable — used fallback resolution`,
      mppExchange: exchange,
    };
  }
}
