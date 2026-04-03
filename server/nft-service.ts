// ═══════════════════════════════════════════════════════════════
// AGENT NFT SERVICE — SEP-50 on Soroban
//
// Interacts with the deployed Agent NFT contract on Stellar
// testnet. Mints, queries, and lists agent NFTs via the
// Stellar CLI (invoked as a subprocess for Soroban calls).
//
// Contract: CAYN27RZZVAGNDXSBZYQP6DUOOCV36SZCOKS6SNKJWPNUD4LDXCGH22O
// Network:  Stellar Testnet
// ═══════════════════════════════════════════════════════════════

import { execSync } from "child_process";

const CONTRACT_ID = "CAYN27RZZVAGNDXSBZYQP6DUOOCV36SZCOKS6SNKJWPNUD4LDXCGH22O";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const DEPLOYER_IDENTITY = "velvet-bazaar-deployer";

export interface AgentNFTMetadata {
  tokenId: string;
  version: number;
  name: string;
  title: string;
  emoji: string;
  specialty: string;
  description: string;
  quirk: string;
  haggleBonus: number;
  scoutBonus: number;
  charmBonus: number;
  riskFactor: number;
  costPerMission: number;
  missionsCompleted: number;
  morale: number;
  mintedBy: string;
  mintedAt: number;
  originBrand: string;
  originDay: number;
}

function stellarInvoke(fnName: string, args: string): string {
  const cmd = `stellar contract invoke \
    --id ${CONTRACT_ID} \
    --source ${DEPLOYER_IDENTITY} \
    --rpc-url ${RPC_URL} \
    --network-passphrase "${NETWORK_PASSPHRASE}" \
    -- ${fnName} ${args}`;

  return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
}

function stellarInvokeReadOnly(fnName: string, args: string): string {
  const cmd = `stellar contract invoke \
    --id ${CONTRACT_ID} \
    --source ${DEPLOYER_IDENTITY} \
    --rpc-url ${RPC_URL} \
    --network-passphrase "${NETWORK_PASSPHRASE}" \
    --send=no \
    -- ${fnName} ${args}`;

  return execSync(cmd, { encoding: "utf8", timeout: 15000 }).trim();
}

export class AgentNFTService {
  private available: boolean;

  constructor() {
    // Check if stellar CLI is available
    try {
      execSync("stellar version", { encoding: "utf8", timeout: 5000 });
      this.available = true;
    } catch {
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getContractId(): string {
    return CONTRACT_ID;
  }

  /**
   * Mint an agent as a SEP-50 NFT on Soroban.
   */
  async mint(metadata: AgentNFTMetadata): Promise<{ txHash: string; tokenId: number }> {
    if (!this.available) {
      throw new Error("Stellar CLI not available");
    }

    // Build the agent struct for Soroban
    const agentJson = JSON.stringify({
      name: metadata.name,
      title: metadata.title,
      emoji: metadata.emoji,
      specialty: metadata.specialty,
      haggle_bonus: metadata.haggleBonus,
      scout_bonus: metadata.scoutBonus,
      charm_bonus: metadata.charmBonus,
      risk_factor: Math.round(metadata.riskFactor * 100),
      cost_per_mission: metadata.costPerMission,
      missions_completed: metadata.missionsCompleted,
      morale: metadata.morale,
      origin_brand: metadata.originBrand,
      origin_day: metadata.originDay,
    });

    // Use the deployer address as owner (in production, this would be the player's smart account)
    const ownerAddress = metadata.mintedBy.startsWith("G")
      ? metadata.mintedBy
      : execSync(`stellar keys address ${DEPLOYER_IDENTITY}`, { encoding: "utf8" }).trim();

    const result = stellarInvoke(
      "mint",
      `--owner ${ownerAddress} --agent '${agentJson}'`
    );

    // Result is the token ID (a number)
    const tokenId = parseInt(result, 10);

    return {
      txHash: `soroban-mint-${tokenId}-${Date.now().toString(36)}`,
      tokenId,
    };
  }

  /**
   * Get agent data for a specific token ID.
   */
  async getAgent(tokenId: number): Promise<AgentNFTMetadata | null> {
    if (!this.available) return null;

    try {
      const result = stellarInvokeReadOnly("get_agent", `--token_id ${tokenId}`);
      const data = JSON.parse(result);

      return {
        tokenId: String(tokenId),
        version: 1,
        name: data.name,
        title: data.title,
        emoji: data.emoji,
        specialty: data.specialty,
        description: "",
        quirk: "",
        haggleBonus: data.haggle_bonus,
        scoutBonus: data.scout_bonus,
        charmBonus: data.charm_bonus,
        riskFactor: data.risk_factor / 100,
        costPerMission: data.cost_per_mission,
        missionsCompleted: data.missions_completed,
        morale: data.morale,
        mintedBy: "",
        mintedAt: 0,
        originBrand: data.origin_brand,
        originDay: data.origin_day,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the total number of minted NFTs.
   */
  async totalSupply(): Promise<number> {
    if (!this.available) return 0;

    try {
      const result = stellarInvokeReadOnly("total_supply", "");
      return parseInt(result, 10);
    } catch {
      return 0;
    }
  }

  /**
   * List all agent NFTs (reads sequentially up to total supply).
   * In production, this would use an indexer.
   */
  async listNFTs(_walletAddress?: string): Promise<AgentNFTMetadata[]> {
    if (!this.available) return [];

    try {
      const total = await this.totalSupply();
      const agents: AgentNFTMetadata[] = [];

      for (let i = 1; i <= total; i++) {
        const agent = await this.getAgent(i);
        if (agent) agents.push(agent);
      }

      return agents;
    } catch {
      return [];
    }
  }
}
