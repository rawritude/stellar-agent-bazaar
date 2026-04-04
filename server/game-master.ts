// ═══════════════════════════════════════════════════════════════
// GAME MASTER — Issues and manages the RUBY token economy
//
// The Game Master is the monetary authority of The Velvet Ledger.
// It mints RUBY tokens, funds players and counterparties, and
// manages the in-game economy. Every ¤ in the game is a real
// RUBY token on Stellar testnet.
// ═══════════════════════════════════════════════════════════════

import * as StellarSdk from "@stellar/stellar-sdk";
import { execSync } from "child_process";
import { deriveCounterpartyKeypair } from "./agent-wallets";

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

// RUBY token config
const RUBY_CODE = "RUBY";
const RUBY_DECIMALS = 7; // Stellar standard

export interface GameMasterConfig {
  secretKey?: string; // Persistent GM secret key (from env)
}

export class GameMaster {
  private keypair: StellarSdk.Keypair;
  private server: StellarSdk.Horizon.Server;
  private funded: boolean = false;
  private rubyAsset: StellarSdk.Asset;
  private rubySACAddress: string | null = null;

  constructor(config?: GameMasterConfig) {
    if (config?.secretKey) {
      this.keypair = StellarSdk.Keypair.fromSecret(config.secretKey);
      console.log(`[GM] Loaded existing Game Master: ${this.keypair.publicKey()}`);
    } else {
      this.keypair = StellarSdk.Keypair.random();
      console.log(`[GM] Generated new Game Master: ${this.keypair.publicKey()}`);
      console.log(`[GM] Secret (save to .env as GM_SECRET_KEY): ${this.keypair.secret()}`);
    }
    this.server = new StellarSdk.Horizon.Server(HORIZON_TESTNET);
    this.rubyAsset = new StellarSdk.Asset(RUBY_CODE, this.keypair.publicKey());
  }

  /** Get GM public info */
  getInfo() {
    return {
      publicKey: this.keypair.publicKey(),
      assetCode: RUBY_CODE,
      assetIssuer: this.keypair.publicKey(),
      sacAddress: this.rubySACAddress,
      funded: this.funded,
      explorerUrl: `${EXPLORER_BASE}/account/${this.keypair.publicKey()}`,
      assetExplorerUrl: `${EXPLORER_BASE}/asset/${RUBY_CODE}-${this.keypair.publicKey()}`,
    };
  }

  /** Get the RUBY SAC contract address (for MPP payments). Null if not deployed. */
  getSACAddress(): string | null {
    return this.rubySACAddress;
  }

  /** Get the RUBY asset object */
  getAsset(): StellarSdk.Asset {
    return this.rubyAsset;
  }

  /** Fund the GM account via testnet friendbot */
  async fundSelf(): Promise<boolean> {
    if (this.funded) return true;
    try {
      const res = await fetch(`${FRIENDBOT_URL}?addr=${this.keypair.publicKey()}`);
      if (res.ok) {
        this.funded = true;
        console.log(`[GM] Funded via friendbot`);
        return true;
      }
      // May already be funded — friendbot returns various error messages
      const body = await res.json().catch(() => null);
      const detail = body?.detail || "";
      if (detail.includes("createAccountAlreadyExist") || detail.includes("already funded")) {
        this.funded = true;
        console.log(`[GM] Already funded`);
        return true;
      }
      // Also check if account exists directly
      try {
        await this.server.loadAccount(this.keypair.publicKey());
        this.funded = true;
        console.log(`[GM] Account exists on testnet`);
        return true;
      } catch {}
      console.warn(`[GM] Friendbot returned ${res.status}: ${detail}`);
      return false;
    } catch (err: any) {
      console.error(`[GM] Fund failed:`, err.message);
      return false;
    }
  }

  /**
   * Ensure a destination account exists.
   * For classic accounts, checks/creates via friendbot.
   * Smart accounts (Soroban contracts) don't need trustlines — they use the SAC.
   */
  async setupTrustline(destinationPubkey: string): Promise<boolean> {
    try {
      // Check if this is a classic account (G...) or contract (C...)
      if (destinationPubkey.startsWith("C")) {
        // Smart contract / SAC address — no trustline needed
        console.log(`[GM] ${destinationPubkey.slice(0, 12)}... is a contract — no trustline needed`);
        return true;
      }

      // Classic account — ensure it exists
      try {
        await this.server.loadAccount(destinationPubkey);
      } catch {
        const res = await fetch(`${FRIENDBOT_URL}?addr=${destinationPubkey}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const detail = body?.detail || "";
          if (!detail.includes("createAccountAlreadyExist") && !detail.includes("already funded")) {
            console.error(`[GM] Cannot fund ${destinationPubkey.slice(0, 12)}...`);
            return false;
          }
        }
      }

      // For classic accounts we don't control, we can't add the trustline.
      // mintRuby will try classic payment first, then fall back to SAC invocation.
      return true;
    } catch (err: any) {
      console.error(`[GM] Setup failed:`, err.message);
      return false;
    }
  }

  /**
   * Establish a RUBY trustline from an account we control.
   * Used for agent wallets and counterparties (where we have the keypair).
   */
  async addTrustline(keypair: StellarSdk.Keypair): Promise<boolean> {
    try {
      const account = await this.server.loadAccount(keypair.publicKey());

      // Check if already has trustline
      const hasTrustline = account.balances.some(
        (b: any) => b.asset_code === RUBY_CODE && b.asset_issuer === this.keypair.publicKey()
      );
      if (hasTrustline) return true;

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.changeTrust({
            asset: this.rubyAsset,
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(keypair);
      await this.server.submitTransaction(tx);
      console.log(`[GM] Trustline added for ${keypair.publicKey().slice(0, 12)}...`);
      return true;
    } catch (err: any) {
      console.error(`[GM] Add trustline failed:`, err.message);
      return false;
    }
  }

  /**
   * Mint RUBY tokens to a destination.
   * For classic accounts (with trustlines): uses classic payment from issuer.
   * For smart accounts (Soroban contracts): uses SAC contract invocation.
   */
  async mintRuby(destination: string, amount: number): Promise<{ success: boolean; txHash?: string }> {
    if (!this.funded) {
      console.warn(`[GM] Cannot mint — not funded yet`);
      return { success: false };
    }

    // Try classic payment first (works for accounts with RUBY trustlines)
    try {
      const account = await this.server.loadAccount(this.keypair.publicKey());
      const amountStr = amount.toFixed(RUBY_DECIMALS);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination,
            asset: this.rubyAsset,
            amount: amountStr,
          })
        )
        .addMemo(StellarSdk.Memo.text("VL:MINT"))
        .setTimeout(30)
        .build();

      tx.sign(this.keypair);
      const result = await this.server.submitTransaction(tx);
      const txHash = result.hash;

      console.log(`[GM] Minted ${amount} RUBY → ${destination.slice(0, 12)}... (TX: ${txHash.slice(0, 12)}...)`);
      return { success: true, txHash };
    } catch (classicErr: any) {
      // Classic payment failed — destination may be a smart account (no trustline needed for SAC)
      if (this.rubySACAddress) {
        return this.mintViaSAC(destination, amount);
      }
      console.error(`[GM] Mint failed:`, classicErr.message);
      return { success: false };
    }
  }

  /**
   * Mint RUBY to a smart account via SAC contract invocation.
   * Smart accounts don't need trustlines — the SAC handles token balances.
   */
  private async mintViaSAC(destination: string, amount: number): Promise<{ success: boolean; txHash?: string }> {
    if (!this.rubySACAddress) return { success: false };

    try {
      // Use stellar CLI to invoke the SAC transfer
      // The GM (issuer) transfers RUBY to the destination via the SAC contract
      const amountStroops = Math.round(amount * 10_000_000); // 7 decimal places
      const output = execSync(
        `stellar contract invoke \
          --id ${this.rubySACAddress} \
          --source-account velvet-ledger-gm \
          --network testnet \
          -- transfer \
          --from ${this.keypair.publicKey()} \
          --to ${destination} \
          --amount ${amountStroops} 2>&1`,
        { encoding: "utf-8", timeout: 30000 }
      ).trim();

      // Try to extract tx hash from output
      const txMatch = output.match(/([a-f0-9]{64})/i);
      const txHash = txMatch ? txMatch[1] : undefined;

      console.log(`[GM] Minted ${amount} RUBY via SAC → ${destination.slice(0, 12)}...${txHash ? ` (TX: ${txHash.slice(0, 12)}...)` : ""}`);
      return { success: true, txHash };
    } catch (err: any) {
      console.error(`[GM] SAC mint failed:`, err.message?.slice(0, 200));
      return { success: false };
    }
  }

  /** Check RUBY balance for any account */
  async getBalance(address: string): Promise<number> {
    try {
      const account = await this.server.loadAccount(address);
      const rubyBalance = account.balances.find(
        (b: any) => b.asset_code === RUBY_CODE && b.asset_issuer === this.keypair.publicKey()
      );
      return rubyBalance ? parseFloat((rubyBalance as any).balance) : 0;
    } catch {
      return 0;
    }
  }

  /** Fund a set of counterparty wallets with RUBY reserves */
  async fundCounterparties(counterpartyKeypairs: Map<string, StellarSdk.Keypair>, amount: number = 1000): Promise<void> {
    for (const [id, kp] of counterpartyKeypairs) {
      // Ensure account exists
      try {
        await this.server.loadAccount(kp.publicKey());
      } catch {
        const res = await fetch(`${FRIENDBOT_URL}?addr=${kp.publicKey()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const detail = body?.detail || "";
          if (!detail.includes("createAccountAlreadyExist") && !detail.includes("already funded")) {
            console.warn(`[GM] Cannot fund counterparty ${id}`);
            continue;
          }
        }
      }

      // Add trustline
      await this.addTrustline(kp);

      // Mint RUBY
      const balance = await this.getBalance(kp.publicKey());
      if (balance < amount / 2) {
        await this.mintRuby(kp.publicKey(), amount);
      }
    }
  }

  /**
   * Deploy RUBY as a Soroban SAC (Stellar Asset Contract).
   * This wraps the classic RUBY asset so it can be used with the MPP SDK.
   * Requires `stellar` CLI to be installed.
   */
  async deploySAC(): Promise<string | null> {
    if (this.rubySACAddress) return this.rubySACAddress;

    // Check if cached in env
    if (process.env.RUBY_SAC_ADDRESS) {
      this.rubySACAddress = process.env.RUBY_SAC_ADDRESS;
      console.log(`[GM] RUBY SAC loaded from env: ${this.rubySACAddress}`);
      return this.rubySACAddress;
    }

    try {
      // Check if stellar CLI is available
      execSync("stellar --version", { stdio: "pipe" });
    } catch {
      console.warn(`[GM] stellar CLI not available — cannot deploy SAC. MPP will use XLM.`);
      return null;
    }

    try {
      // First, ensure the GM identity exists in stellar CLI
      try {
        execSync(`stellar keys address velvet-ledger-gm`, { stdio: "pipe" });
      } catch {
        // Add the GM key to stellar CLI — pipe secret via stdin since --secret-key is interactive
        execSync(`echo "${this.keypair.secret()}" | stellar keys add velvet-ledger-gm --secret-key`, { stdio: "pipe", shell: "/bin/bash" });
        console.log(`[GM] Added GM identity to stellar CLI`);
      }

      // Deploy the SAC
      const assetStr = `${RUBY_CODE}:${this.keypair.publicKey()}`;
      const output = execSync(
        `stellar contract asset deploy --asset "${assetStr}" --source-account velvet-ledger-gm --network testnet 2>&1`,
        { encoding: "utf-8", timeout: 60000 }
      ).trim();

      // The output should be the contract address (C...)
      if (output.startsWith("C") && output.length === 56) {
        this.rubySACAddress = output;
        console.log(`[GM] RUBY SAC deployed: ${this.rubySACAddress}`);
        console.log(`[GM] Save to .env as RUBY_SAC_ADDRESS=${this.rubySACAddress}`);
        return this.rubySACAddress;
      }

      // Some versions output more — try to extract the C... address
      const match = output.match(/(C[A-Z0-9]{55})/);
      if (match) {
        this.rubySACAddress = match[1];
        console.log(`[GM] RUBY SAC deployed: ${this.rubySACAddress}`);
        return this.rubySACAddress;
      }

      console.warn(`[GM] SAC deploy output unexpected: ${output.slice(0, 100)}`);
      return null;
    } catch (err: any) {
      // If already deployed, the error message may contain the address
      const errStr = err.message || err.stderr || "";
      if (errStr.includes("already been deployed")) {
        const match = errStr.match(/(C[A-Z0-9]{55})/);
        if (match) {
          this.rubySACAddress = match[1];
          console.log(`[GM] RUBY SAC already deployed: ${this.rubySACAddress}`);
          return this.rubySACAddress;
        }
      }
      console.warn(`[GM] SAC deployment failed: ${errStr.slice(0, 200)}`);
      return null;
    }
  }

  /** Initialize the GM — fund self, deploy SAC, prepare the economy */
  async initialize(): Promise<boolean> {
    const funded = await this.fundSelf();
    if (!funded) {
      console.error(`[GM] Failed to initialize — cannot fund GM account`);
      return false;
    }

    // Try to deploy RUBY SAC (non-blocking — falls back to XLM if it fails)
    const sacAddress = await this.deploySAC();
    if (sacAddress) {
      console.log(`[GM] RUBY SAC ready for MPP payments: ${sacAddress}`);
    } else {
      console.warn(`[GM] RUBY SAC not available — MPP will fall back to XLM`);
    }

    // Fund counterparty wallets (non-blocking — log warnings on failure)
    const counterpartyIds = [
      "madame-lentil", "guild-of-ledgers", "fungal-permits", "whisper-network",
      "cart-mule-logistics", "magnifying-order", "crows-associates", "shadow-desk",
      "festival-criers",
    ];
    const cpKeypairs = new Map<string, StellarSdk.Keypair>();
    for (const id of counterpartyIds) {
      cpKeypairs.set(id, deriveCounterpartyKeypair(id));
    }
    this.fundCounterparties(cpKeypairs, 1000).catch(err => {
      console.warn(`[GM] Counterparty funding failed (non-blocking):`, err.message);
    });

    console.log(`[GM] Game Master ready. RUBY issuer: ${this.keypair.publicKey()}`);
    console.log(`[GM] Explorer: ${EXPLORER_BASE}/account/${this.keypair.publicKey()}`);
    return true;
  }
}

// ── Singleton ──────────────────────────────────────────────────

let gameMaster: GameMaster | null = null;

export function getGameMaster(): GameMaster {
  if (!gameMaster) {
    gameMaster = new GameMaster({
      secretKey: process.env.GM_SECRET_KEY,
    });
  }
  return gameMaster;
}

export async function initializeGameMaster(): Promise<GameMaster> {
  const gm = getGameMaster();
  await gm.initialize();
  return gm;
}
