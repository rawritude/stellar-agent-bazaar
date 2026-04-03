import type { Express } from "express";
import { type Server } from "http";
import { StellarSettlementService } from "./stellar-settlement";
import { AISceneGenerator } from "./ai-engine";
import { generateX402Flow, X402_ACTION_MAP } from "./x402";
import { AgentNFTService } from "./nft-service";
import { generateAgents } from "./agent-generator";
import { canSpend, recordSpend, getBudgetStatus } from "./budget";
import { saveGame, loadGame, getSaveSummary, deleteSave } from "./save-service";
import { log } from "./index";

// Singleton services — persist across requests
let stellarService: StellarSettlementService | null = null;
let aiGenerator: AISceneGenerator | null = null;
let nftService: AgentNFTService | null = null;

function getService(): StellarSettlementService {
  if (!stellarService) {
    stellarService = new StellarSettlementService();
  }
  return stellarService;
}

function getAI(): AISceneGenerator {
  if (!aiGenerator) {
    aiGenerator = new AISceneGenerator(200); // max 200 calls per session
    const available = aiGenerator.isAvailable();
    log(`AI scene generator: ${available ? "ready (Haiku)" : "unavailable (no ANTHROPIC_API_KEY)"}`, "ai");
  }
  return aiGenerator;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Wallet Info ─────────────────────────────────────────────
  app.get("/api/wallet", (_req, res) => {
    const service = getService();
    const info = service.getWalletInfo();
    res.json(info);
  });

  // ── Fund Wallet ─────────────────────────────────────────────
  app.post("/api/wallet/fund", async (_req, res) => {
    const service = getService();
    const result = await service.fundWallet();
    log(`Wallet fund: ${result.success ? "success" : "failed"} — ${result.message}`, "stellar");
    res.json(result);
  });

  // ── Settle Action ───────────────────────────────────────────
  app.post("/api/settle", async (req, res) => {
    const service = getService();
    const {
      actionType,
      counterpartyId,
      counterpartyName,
      amount,
      agentId,
      districtId,
      missionId,
      success,
      day,
    } = req.body;

    // Basic validation
    if (!actionType || !counterpartyId || amount === undefined) {
      return res.status(400).json({
        error: "Missing required fields: actionType, counterpartyId, amount",
      });
    }

    try {
      const result = await service.settle({
        actionType,
        counterpartyId,
        counterpartyName: counterpartyName ?? counterpartyId,
        amount: Number(amount),
        agentId: agentId ?? "unknown",
        districtId: districtId ?? "unknown",
        missionId: missionId ?? "unknown",
        success: success !== false,
        day: Number(day) || 0,
      });

      // Attach x402/MPP protocol flow if this is a x402-eligible action
      if (X402_ACTION_MAP[actionType]) {
        const x402Flow = generateX402Flow(
          actionType,
          counterpartyName ?? counterpartyId,
          Number(amount),
          result.receipt.destinationAccount ?? "SIMULATED",
          `VLB:${actionType}:${counterpartyId}`.slice(0, 28),
          result.receipt.stellarTxId,
          result.receipt.settlementMode === "testnet",
        );
        result.receipt.x402Flow = x402Flow;
      }

      const mode = result.receipt.settlementMode;
      const txInfo = result.receipt.stellarTxId
        ? ` TX: ${result.receipt.stellarTxId.slice(0, 12)}...`
        : "";
      const x402Info = X402_ACTION_MAP[actionType] ? " [x402/MPP]" : "";
      log(`Settle ${actionType} → ${mode}${txInfo}${x402Info} (${amount}¤)`, "stellar");

      res.json(result);
    } catch (err: any) {
      console.error("Settlement error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Save/Load Game ───────────────────────────────────────────
  app.post("/api/save", (req, res) => {
    const { wallet, state } = req.body;
    if (!wallet || !state) {
      return res.status(400).json({ error: "wallet and state required" });
    }
    saveGame(wallet, state);
    log(`Game saved: ${state.brandName} Day ${state.day} (${wallet.slice(0, 12)}...)`, "save");
    res.json({ saved: true });
  });

  app.get("/api/load/:wallet", (req, res) => {
    const state = loadGame(req.params.wallet);
    if (state) {
      log(`Game loaded: ${state.brandName} Day ${state.day} (${req.params.wallet.slice(0, 12)}...)`, "save");
      res.json({ found: true, state });
    } else {
      res.json({ found: false });
    }
  });

  app.get("/api/save-summary/:wallet", (req, res) => {
    const summary = getSaveSummary(req.params.wallet);
    res.json({ found: !!summary, summary });
  });

  app.delete("/api/save/:wallet", (req, res) => {
    deleteSave(req.params.wallet);
    res.json({ deleted: true });
  });

  // ── Budget Status ────────────────────────────────────────────
  app.get("/api/budget/:wallet", (req, res) => {
    res.json(getBudgetStatus(req.params.wallet));
  });

  // ── Generate Agents (budget-controlled) ─────────────────────
  app.post("/api/generate-agents", async (req, res) => {
    const { brandName, wallet } = req.body;
    const walletAddr = wallet || "anonymous";

    // Check budget
    const budget = canSpend(walletAddr);
    if (!budget.allowed) {
      return res.json({
        agents: null,
        error: "Daily budget exceeded. Come back tomorrow!",
        budget: getBudgetStatus(walletAddr),
      });
    }

    try {
      const result = await generateAgents(brandName || "The Velvet Ledger");

      // Record spend
      recordSpend(walletAddr, result.tokensUsed.input, result.tokensUsed.output);

      const tokenInfo = `${result.tokensUsed.input}+${result.tokensUsed.output} tokens`;
      const rarityInfo = result.rarities.join(", ");
      log(`Agents generated: ${result.agents.map(a => `${a.name} [${a.rarity}]`).join(", ")} (${tokenInfo})`, "ai");
      log(`Rarity rolls: ${rarityInfo}`, "ai");
      // Send agents to client (rarity is on each agent, but the internal rolls are not exposed)
      res.json({ agents: result.agents, budget: getBudgetStatus(walletAddr) });
    } catch (err: any) {
      log(`Agent generation failed: ${err.message}`, "ai");
      res.json({ agents: null, error: err.message });
    }
  });

  // ── AI Status ────────────────────────────────────────────────
  app.get("/api/ai/status", (_req, res) => {
    const ai = getAI();
    res.json(ai.getStats());
  });

  // ── Generate Scene (budget-controlled) ───────────────────────
  app.post("/api/ai/generate-scene", async (req, res) => {
    const ai = getAI();
    const walletAddr = req.body.wallet || "anonymous";

    // Check budget
    const budgetCheck = canSpend(walletAddr);
    if (!budgetCheck.allowed) {
      return res.json({
        scene: null,
        fromAI: false,
        error: "Daily budget exceeded",
        budget: getBudgetStatus(walletAddr),
      });
    }

    if (!ai.isAvailable()) {
      return res.json({
        scene: null,
        fromAI: false,
        error: ai.getStats().configured
          ? "Rate limit reached"
          : "ANTHROPIC_API_KEY not set",
      });
    }

    try {
      const result = await ai.generateScene(req.body);

      // Record spend
      if (result.tokensUsed) {
        recordSpend(walletAddr, result.tokensUsed.input, result.tokensUsed.output);
      }

      if (result.fromAI) {
        const tokenInfo = result.tokensUsed
          ? ` (${result.tokensUsed.input}+${result.tokensUsed.output} tokens)`
          : "";
        log(`AI scene: ${result.scene ? "generated" : "failed"}${tokenInfo}`, "ai");
      }
      res.json({ ...result, budget: getBudgetStatus(walletAddr) });
    } catch (err: any) {
      console.error("AI scene error:", err);
      res.json({ scene: null, fromAI: false, error: err.message });
    }
  });

  // ── NFT: Status ──────────────────────────────────────────────
  app.get("/api/nft/status", (_req, res) => {
    if (!nftService) nftService = new AgentNFTService();
    res.json({
      available: nftService.isAvailable(),
      contractId: nftService.getContractId(),
      network: "testnet",
    });
  });

  // ── NFT: Mint Agent ──────────────────────────────────────────
  app.post("/api/nft/mint", async (req, res) => {
    if (!nftService) nftService = new AgentNFTService();

    try {
      const result = await nftService.mint(req.body);
      log(`NFT minted: ${req.body.name} → token #${result.tokenId} (Soroban)`, "nft");
      res.json(result);
    } catch (err: any) {
      log(`NFT mint failed: ${err.message}`, "nft");
      res.json({
        txHash: `SIM-${Date.now().toString(36)}`,
        tokenId: 0,
        simulated: true,
        error: err.message,
      });
    }
  });

  // ── NFT: List Agents ────────────────────────────────────────
  app.get("/api/nft/list", async (req, res) => {
    if (!nftService) nftService = new AgentNFTService();

    try {
      const agents = await nftService.listNFTs(req.query.wallet as string);
      res.json({ agents });
    } catch (err: any) {
      res.json({ agents: [], error: err.message });
    }
  });

  // ── NFT: Get Agent by Token ID ──────────────────────────────
  app.get("/api/nft/:tokenId", async (req, res) => {
    if (!nftService) nftService = new AgentNFTService();

    try {
      const agent = await nftService.getAgent(parseInt(req.params.tokenId, 10));
      res.json({ agent });
    } catch (err: any) {
      res.json({ agent: null, error: err.message });
    }
  });

  return httpServer;
}
