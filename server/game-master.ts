// ═══════════════════════════════════════════════════════════════
// GAME MASTER — Issues and manages the RUBY token economy
//
// The Game Master is the monetary authority of The Velvet Ledger.
// It mints RUBY tokens, funds players and counterparties, and
// manages the in-game economy. Every ¤ in the game is a real
// RUBY token on Stellar testnet.
// ═══════════════════════════════════════════════════════════════

import * as StellarSdk from "@stellar/stellar-sdk";

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
      funded: this.funded,
      explorerUrl: `${EXPLORER_BASE}/account/${this.keypair.publicKey()}`,
    };
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
      // May already be funded
      const body = await res.json().catch(() => null);
      if (body?.detail?.includes("createAccountAlreadyExist")) {
        this.funded = true;
        console.log(`[GM] Already funded`);
        return true;
      }
      console.warn(`[GM] Friendbot returned ${res.status}`);
      return false;
    } catch (err: any) {
      console.error(`[GM] Fund failed:`, err.message);
      return false;
    }
  }

  /** Ensure a destination account exists and has a RUBY trustline */
  async setupTrustline(destinationPubkey: string): Promise<boolean> {
    try {
      // First ensure the account exists
      try {
        await this.server.loadAccount(destinationPubkey);
      } catch {
        // Account doesn't exist — fund via friendbot
        const res = await fetch(`${FRIENDBOT_URL}?addr=${destinationPubkey}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (!body?.detail?.includes("createAccountAlreadyExist")) {
            console.error(`[GM] Cannot fund ${destinationPubkey.slice(0, 12)}...`);
            return false;
          }
        }
      }

      // Check if trustline already exists
      const account = await this.server.loadAccount(destinationPubkey);
      const hasTrustline = account.balances.some(
        (b: any) => b.asset_code === RUBY_CODE && b.asset_issuer === this.keypair.publicKey()
      );
      if (hasTrustline) return true;

      // Trustline must be set by the destination account itself.
      // For testnet demo purposes, we'll skip this for now and
      // handle it in the agent wallet service where we control the keypair.
      console.log(`[GM] Account ${destinationPubkey.slice(0, 12)}... needs RUBY trustline`);
      return true;
    } catch (err: any) {
      console.error(`[GM] Trustline setup failed:`, err.message);
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
   * The GM is the issuer — "minting" is just a payment from issuer.
   */
  async mintRuby(destination: string, amount: number): Promise<{ success: boolean; txHash?: string }> {
    if (!this.funded) {
      console.warn(`[GM] Cannot mint — not funded yet`);
      return { success: false };
    }

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
    } catch (err: any) {
      console.error(`[GM] Mint failed:`, err.message);
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
          if (!body?.detail?.includes("createAccountAlreadyExist")) {
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

  /** Initialize the GM — fund self and prepare the economy */
  async initialize(): Promise<boolean> {
    const funded = await this.fundSelf();
    if (!funded) {
      console.error(`[GM] Failed to initialize — cannot fund GM account`);
      return false;
    }
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
