// ═══════════════════════════════════════════════════════════════
// AGENT NFT SYSTEM — SEP-50 Compatible
//
// Manages agent data as NFT-like tokens on Stellar.
// Currently uses manage_data operations on the player's account
// to store agent metadata. Structured for future migration to
// a full SEP-50 Soroban NFT contract.
//
// Each agent NFT contains:
// - Token ID (unique identifier)
// - Agent stats (name, title, bonuses, quirk)
// - Mission history (missions completed, morale)
// - Origin (which game run created this agent)
// ═══════════════════════════════════════════════════════════════

import type { Agent } from "../gameData";

export interface AgentNFTMetadata {
  tokenId: string;
  version: number;
  // Core identity
  name: string;
  title: string;
  emoji: string;
  specialty: string;
  description: string;
  quirk: string;
  // Stats at time of minting
  haggleBonus: number;
  scoutBonus: number;
  charmBonus: number;
  riskFactor: number;
  costPerMission: number;
  // History
  missionsCompleted: number;
  morale: number;
  // Provenance
  mintedBy: string;       // wallet address
  mintedAt: number;       // timestamp
  originBrand: string;    // brand name of the game that created this agent
  originDay: number;      // which day the agent was minted on
}

export interface MintResult {
  success: boolean;
  tokenId?: string;
  txHash?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  agents: AgentNFTMetadata[];
  error?: string;
}

/**
 * Generate a unique token ID for an agent NFT.
 */
function generateTokenId(agentId: string, walletAddress: string): string {
  const timestamp = Date.now().toString(36);
  const walletSuffix = walletAddress.slice(-6);
  return `VLB-${agentId}-${walletSuffix}-${timestamp}`.toUpperCase();
}

/**
 * Convert a game agent to NFT metadata for minting.
 */
export function agentToNFTMetadata(
  agent: Agent,
  walletAddress: string,
  brandName: string,
  day: number,
): AgentNFTMetadata {
  return {
    tokenId: generateTokenId(agent.id, walletAddress),
    version: 1,
    name: agent.name,
    title: agent.title,
    emoji: agent.emoji,
    specialty: agent.specialty,
    description: agent.description,
    quirk: agent.quirk,
    haggleBonus: agent.haggleBonus,
    scoutBonus: agent.scoutBonus,
    charmBonus: agent.charmBonus,
    riskFactor: agent.riskFactor,
    costPerMission: agent.costPerMission,
    missionsCompleted: agent.missionsCompleted,
    morale: agent.morale,
    mintedBy: walletAddress,
    mintedAt: Date.now(),
    originBrand: brandName,
    originDay: day,
  };
}

/**
 * Convert NFT metadata back to a game-usable Agent.
 */
export function nftToAgent(nft: AgentNFTMetadata): Agent {
  // Generate a deterministic ID from the token
  const id = nft.tokenId.toLowerCase().replace(/[^a-z0-9-]/g, "");

  return {
    id,
    name: nft.name,
    title: nft.title,
    emoji: nft.emoji,
    specialty: nft.specialty,
    description: nft.description,
    quirk: nft.quirk,
    haggleBonus: nft.haggleBonus,
    scoutBonus: nft.scoutBonus,
    charmBonus: nft.charmBonus,
    riskFactor: nft.riskFactor,
    costPerMission: nft.costPerMission,
    status: "idle",
    morale: nft.morale,
    missionsCompleted: nft.missionsCompleted,
    memory: { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] },
  };
}

/**
 * Mint an agent as an NFT via the server API.
 * The server stores the metadata on-chain using manage_data.
 * Future: this will call a SEP-50 Soroban contract instead.
 */
export async function mintAgentNFT(
  agent: Agent,
  walletAddress: string,
  brandName: string,
  day: number,
): Promise<MintResult> {
  const metadata = agentToNFTMetadata(agent, walletAddress, brandName, day);

  try {
    const res = await fetch("/api/nft/mint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error || "Mint failed" };
    }

    const result = await res.json();
    return {
      success: true,
      tokenId: metadata.tokenId,
      txHash: result.txHash,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Import agents from the player's wallet.
 * Reads manage_data entries that contain agent NFT metadata.
 * Future: this will query a SEP-50 contract for owned tokens.
 */
export async function importAgentNFTs(walletAddress: string): Promise<ImportResult> {
  try {
    const res = await fetch(`/api/nft/list?wallet=${encodeURIComponent(walletAddress)}`);

    if (!res.ok) {
      return { success: false, agents: [], error: "Failed to query NFTs" };
    }

    const result = await res.json();
    return {
      success: true,
      agents: result.agents || [],
    };
  } catch (err: any) {
    return { success: false, agents: [], error: err.message };
  }
}
