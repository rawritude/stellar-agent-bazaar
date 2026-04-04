// ═══════════════════════════════════════════════════════════════
// AGENT WALLET SERVICE — Each agent gets a real Stellar wallet
//
// Agent keypairs are derived deterministically from the player's
// public key + agent ID. This means the same player + agent combo
// always produces the same wallet address.
//
// Flow: Player funds agent → Agent spends at counterparties →
//       Agent returns surplus to player
// ═══════════════════════════════════════════════════════════════

import * as StellarSdk from "@stellar/stellar-sdk";
import { createHash } from "crypto";
import { getGameMaster } from "./game-master";

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";

export interface AgentWallet {
  agentId: string;
  publicKey: string;
  keypair: StellarSdk.Keypair;
  funded: boolean;
}

/**
 * Derive a deterministic keypair for an agent.
 * Uses SHA-256(playerPubkey + agentId) as seed for the raw key.
 */
function deriveAgentKeypair(playerPubkey: string, agentId: string): StellarSdk.Keypair {
  const seed = createHash("sha256")
    .update(`${playerPubkey}:${agentId}:velvet-ledger-agent`)
    .digest();
  // Use first 32 bytes as ed25519 seed
  return StellarSdk.Keypair.fromRawEd25519Seed(seed);
}

/**
 * Derive a deterministic keypair for a counterparty.
 * Same approach — deterministic from counterparty ID.
 */
export function deriveCounterpartyKeypair(counterpartyId: string): StellarSdk.Keypair {
  const seed = createHash("sha256")
    .update(`counterparty:${counterpartyId}:velvet-ledger`)
    .digest();
  return StellarSdk.Keypair.fromRawEd25519Seed(seed);
}

/**
 * Derive a deterministic keypair for a rival brand.
 */
export function deriveRivalKeypair(rivalName: string): StellarSdk.Keypair {
  const seed = createHash("sha256")
    .update(`rival:${rivalName}:velvet-ledger`)
    .digest();
  return StellarSdk.Keypair.fromRawEd25519Seed(seed);
}

export class AgentWalletService {
  private server: StellarSdk.Horizon.Server;
  private wallets: Map<string, AgentWallet> = new Map();

  constructor() {
    this.server = new StellarSdk.Horizon.Server(HORIZON_TESTNET);
  }

  /**
   * Create (or retrieve) an agent's wallet.
   * Funds via friendbot and establishes RUBY trustline.
   */
  async createAgentWallet(playerPubkey: string, agentId: string): Promise<AgentWallet> {
    const key = `${playerPubkey}:${agentId}`;

    // Return cached if exists
    const existing = this.wallets.get(key);
    if (existing) return existing;

    const keypair = deriveAgentKeypair(playerPubkey, agentId);
    const wallet: AgentWallet = {
      agentId,
      publicKey: keypair.publicKey(),
      keypair,
      funded: false,
    };

    // Fund via friendbot
    try {
      await this.server.loadAccount(keypair.publicKey());
      wallet.funded = true;
    } catch {
      try {
        const res = await fetch(`${FRIENDBOT_URL}?addr=${keypair.publicKey()}`);
        if (res.ok) {
          wallet.funded = true;
        } else {
          const body = await res.json().catch(() => null);
          if (body?.detail?.includes("createAccountAlreadyExist")) {
            wallet.funded = true;
          }
        }
      } catch (err: any) {
        console.error(`[wallet] Failed to fund agent ${agentId}:`, err.message);
      }
    }

    // Establish RUBY trustline
    if (wallet.funded) {
      const gm = getGameMaster();
      await gm.addTrustline(keypair);
    }

    this.wallets.set(key, wallet);
    console.log(`[wallet] Agent ${agentId} wallet: ${keypair.publicKey().slice(0, 12)}... (funded: ${wallet.funded})`);
    return wallet;
  }

  /**
   * Fund an agent with RUBY from the player's account.
   * In a real system, the player would sign this.
   * For testnet demo, the GM mints directly to the agent.
   */
  async fundAgent(agentWallet: AgentWallet, amount: number): Promise<{ success: boolean; txHash?: string }> {
    const gm = getGameMaster();
    return gm.mintRuby(agentWallet.publicKey, amount);
  }

  /**
   * Return surplus RUBY from agent back to player.
   */
  async returnSurplus(agentWallet: AgentWallet, playerAddress: string): Promise<{ success: boolean; txHash?: string; amount: number }> {
    const gm = getGameMaster();
    const balance = await gm.getBalance(agentWallet.publicKey);

    if (balance <= 0) {
      return { success: true, txHash: undefined, amount: 0 };
    }

    try {
      const account = await this.server.loadAccount(agentWallet.publicKey);
      const amountStr = balance.toFixed(7);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: playerAddress,
            asset: gm.getAsset(),
            amount: amountStr,
          })
        )
        .addMemo(StellarSdk.Memo.text("VL:SURPLUS"))
        .setTimeout(30)
        .build();

      tx.sign(agentWallet.keypair);
      const result = await this.server.submitTransaction(tx);

      console.log(`[wallet] Surplus ${balance} RUBY: ${agentWallet.agentId} → player (TX: ${result.hash.slice(0, 12)}...)`);
      return { success: true, txHash: result.hash, amount: balance };
    } catch (err: any) {
      console.error(`[wallet] Surplus return failed:`, err.message);
      return { success: false, amount: balance };
    }
  }

  /** Get an agent's RUBY balance */
  async getBalance(agentWallet: AgentWallet): Promise<number> {
    const gm = getGameMaster();
    return gm.getBalance(agentWallet.publicKey);
  }

  /** Get all counterparty keypairs (for GM funding) */
  getCounterpartyKeypairs(counterpartyIds: string[]): Map<string, StellarSdk.Keypair> {
    const map = new Map<string, StellarSdk.Keypair>();
    for (const id of counterpartyIds) {
      map.set(id, deriveCounterpartyKeypair(id));
    }
    return map;
  }
}

// ── Singleton ──────────────────────────────────────────────────

let walletService: AgentWalletService | null = null;

export function getAgentWalletService(): AgentWalletService {
  if (!walletService) {
    walletService = new AgentWalletService();
  }
  return walletService;
}
