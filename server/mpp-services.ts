// ═══════════════════════════════════════════════════════════════
// MPP SERVICE ENDPOINTS — Real counterparty services with 402
//
// Each counterparty service is protected by the MPP protocol.
// When an agent requests a service, the counterparty returns
// 402 Payment Required with real Stellar payment requirements.
// After payment proof is verified, the service delivers results.
//
// Uses @stellar/mpp SDK for real protocol exchanges.
// ═══════════════════════════════════════════════════════════════

import { Mppx, stellar, Store } from "@stellar/mpp/charge/server";
import { XLM_SAC_TESTNET } from "@stellar/mpp";
import { deriveCounterpartyKeypair } from "./agent-wallets";
import { getGameMaster } from "./game-master";
import type { IncomingMessage, ServerResponse } from "node:http";

// ── Service result types ──────────────────────────────────────

export interface ServiceResult {
  success: boolean;
  data: string;         // The service output (intel, trade result, permit, etc.)
  flavor: string;       // Narrative text for display
  quality: number;      // 0-1 quality rating (affects game outcome)
}

// ── Counterparty service definitions ─────────────────────────

interface CounterpartyService {
  counterpartyId: string;
  actionType: string;
  basePrice: number;       // in XLM (testnet)
  description: string;
  handler: (context: ServiceContext) => ServiceResult;
}

interface ServiceContext {
  agentId: string;
  agentName: string;
  counterpartyId: string;
  counterpartyName: string;
  trust: number;
  mood: string;
  greed: number;
}

// ── Service handlers (what counterparties actually deliver) ───

function deliverIntel(ctx: ServiceContext): ServiceResult {
  const quality = 0.5 + (ctx.trust / 200) + (Math.random() * 0.3);
  const intels = [
    "Spice prices are rising in the Velvet Steps. Act fast.",
    "The Permit Goblins are offering expedited filing this week.",
    "A new merchant has entered the Fungal Quarter. Competition ahead.",
    "Festival Sprawl is expecting record crowds. Brand opportunity.",
    "The Crimson Ledger was seen bribing inspectors. Tread carefully.",
    "Gerald the mule refused three shipments today. Logistics delays expected.",
    "Madame Lentil is running low on cinnamon. Price spike incoming.",
  ];
  return {
    success: true,
    data: intels[Math.floor(Math.random() * intels.length)],
    flavor: `${ctx.counterpartyName} leans in and whispers...`,
    quality: Math.min(1, Math.max(0, quality)),
  };
}

function executeTrade(ctx: ServiceContext): ServiceResult {
  const quality = 0.6 + (ctx.trust / 300) + (Math.random() * 0.2);
  return {
    success: quality > 0.5,
    data: quality > 0.7 ? "Premium goods at favorable terms" : quality > 0.5 ? "Standard trade completed" : "Poor terms — counterparty drove a hard bargain",
    flavor: `${ctx.counterpartyName} examines the offer carefully...`,
    quality: Math.min(1, Math.max(0, quality)),
  };
}

function filePermit(ctx: ServiceContext): ServiceResult {
  const quality = 0.7 + (ctx.trust / 400);
  return {
    success: true,
    data: `Permit ${Math.random().toString(36).slice(2, 8).toUpperCase()} filed and stamped`,
    flavor: `${ctx.counterpartyName} stamps the form with unnecessary vigor.`,
    quality: Math.min(1, Math.max(0, quality)),
  };
}

function shipGoods(ctx: ServiceContext): ServiceResult {
  const quality = 0.6 + (ctx.trust / 300) + (Math.random() * 0.2);
  return {
    success: quality > 0.4,
    data: quality > 0.6 ? "Goods delivered on time and intact" : "Delivery completed with minor delays",
    flavor: `Gerald the mule considers the cargo. ${quality > 0.7 ? "He approves." : "He is unimpressed but compliant."}`,
    quality: Math.min(1, Math.max(0, quality)),
  };
}

const SERVICE_HANDLERS: Record<string, (ctx: ServiceContext) => ServiceResult> = {
  paid_intel: deliverIntel,
  trade_execution: executeTrade,
  permit_filing: filePermit,
  logistics: shipGoods,
};

// ── MPP server instance ──────────────────────────────────────

// Map of counterparty ID → MPP handler
const mppHandlers: Map<string, any> = new Map();

/**
 * Get or create an MPP handler for a counterparty.
 * Each counterparty has its own Stellar address as payment recipient.
 */
function getMppHandler(counterpartyId: string): any {
  let handler = mppHandlers.get(counterpartyId);
  if (handler) return handler;

  const kp = deriveCounterpartyKeypair(counterpartyId);

  // Use RUBY SAC if available, fall back to XLM
  const gm = getGameMaster();
  const currency = gm.getSACAddress() || XLM_SAC_TESTNET;

  handler = Mppx.create({
    methods: [
      stellar.charge({
        recipient: kp.publicKey(),
        currency,
        network: "stellar:testnet",
        store: Store.memory(),
      }),
    ],
    secretKey: process.env.MPP_SECRET_KEY || `mpp-secret-${counterpartyId}`,
  });

  mppHandlers.set(counterpartyId, handler);
  return handler;
}

// ── Express route handler ────────────────────────────────────

/**
 * Handle an MPP service request.
 *
 * The flow:
 * 1. Parse the request context (agent, counterparty, action)
 * 2. Determine price based on counterparty greed/mood/trust
 * 3. Run MPP charge — returns 402 if no payment, 200 if paid
 * 4. On 200: execute service and return result
 */
export async function handleMppService(
  req: IncomingMessage & { body?: any; url?: string },
  res: ServerResponse,
  actionType: string,
): Promise<void> {
  const body = (req as any).body || {};
  const {
    counterpartyId,
    counterpartyName,
    agentId,
    agentName,
    trust = 0,
    mood = "neutral",
    greed = 0.3,
    budget = 10,
  } = body;

  if (!counterpartyId || !agentId) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing counterpartyId or agentId" }));
    return;
  }

  // Calculate price based on counterparty personality
  const basePrice = 0.5; // 0.5 XLM base
  const greedMultiplier = 1 + (greed * 0.5);
  const moodMultiplier = mood === "cooperative" ? 0.8 : mood === "hostile" ? 1.3 : mood === "chaotic" ? (0.5 + Math.random()) : 1.0;
  const trustDiscount = Math.max(0, trust / 500); // -20% at max trust
  const price = Math.max(0.1, basePrice * greedMultiplier * moodMultiplier * (1 - trustDiscount));
  const priceStr = price.toFixed(7);

  const mppx = getMppHandler(counterpartyId);

  // Convert Express Request to Web Request for MPP SDK
  const protocol = (req as any).protocol || "http";
  const host = req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
  }
  const webRequest = new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  try {
    const result = await mppx.stellar.charge({
      amount: priceStr,
      description: `${actionType} service from ${counterpartyName || counterpartyId}`,
    })(webRequest);

    if (result.status === 402) {
      // Return the 402 challenge — client needs to pay
      const challengeResponse = result.challenge;
      res.writeHead(402);
      // Copy headers from the challenge Response
      challengeResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });
      const challengeBody = await challengeResponse.text();
      res.end(challengeBody);
      return;
    }

    // Payment verified — execute the service
    const serviceHandler = SERVICE_HANDLERS[actionType] || deliverIntel;
    const serviceResult = serviceHandler({
      agentId,
      agentName: agentName || agentId,
      counterpartyId,
      counterpartyName: counterpartyName || counterpartyId,
      trust,
      mood,
      greed,
    });

    // Wrap the response with MPP receipt
    const serviceResponse = Response.json({
      service: serviceResult,
      price: parseFloat(priceStr),
      actionType,
      counterpartyId,
    });

    const receiptResponse = result.withReceipt(serviceResponse);
    res.writeHead(200, { "Content-Type": "application/json" });

    // Extract receipt headers
    receiptResponse.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });

    const responseBody = await receiptResponse.text();
    res.end(responseBody);
  } catch (err: any) {
    console.error(`[mpp] Service error (${actionType}):`, err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}

/**
 * Get the price a counterparty would charge for a service.
 * Used by the agent AI to decide before initiating the MPP flow.
 */
export function getServicePrice(
  actionType: string,
  counterparty: { greedFactor: number; mood: string; trust?: number },
): number {
  const basePrice = 0.5;
  const greedMultiplier = 1 + (counterparty.greedFactor * 0.5);
  const moodMultiplier = counterparty.mood === "cooperative" ? 0.8
    : counterparty.mood === "hostile" ? 1.3
    : counterparty.mood === "chaotic" ? (0.5 + Math.random())
    : 1.0;
  const trustDiscount = Math.max(0, (counterparty.trust ?? 0) / 500);
  return Math.max(0.1, basePrice * greedMultiplier * moodMultiplier * (1 - trustDiscount));
}
