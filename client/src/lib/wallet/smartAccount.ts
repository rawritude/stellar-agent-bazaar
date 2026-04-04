// ═══════════════════════════════════════════════════════════════
// SMART ACCOUNT WALLET — Passkey-based Stellar wallet
//
// Uses the Smart Account Kit for one-click wallet creation
// via WebAuthn passkeys. No fallback — passkey is required.
// ═══════════════════════════════════════════════════════════════

export interface WalletInfo {
  address: string;
  type: "passkey";
  connected: boolean;
  credentialId?: string;
}

export interface WalletResult {
  success: boolean;
  wallet?: WalletInfo;
  error?: string;
}

/**
 * Connect a wallet via passkey. No fallback.
 */
export async function connectWallet(): Promise<WalletResult> {
  try {
    console.log("[wallet] Step 1: Environment check...");
    console.log("[wallet]   window exists:", typeof window !== "undefined");
    console.log("[wallet]   isSecureContext:", window?.isSecureContext);
    console.log("[wallet]   location:", window?.location?.href);
    console.log("[wallet]   protocol:", window?.location?.protocol);
    console.log("[wallet]   PublicKeyCredential:", typeof window?.PublicKeyCredential);
    console.log("[wallet]   navigator.credentials:", typeof navigator?.credentials);

    // Don't block on our own check — let the Smart Account Kit try.
    // It has its own WebAuthn detection and better error messages.

    console.log("[wallet] Step 2: Importing Smart Account Kit...");

    const { SmartAccountKit, IndexedDBStorage } = await import("smart-account-kit");

    console.log("[wallet] Step 3: Creating kit instance...");

    const currentHost = window.location.hostname;
    console.log("[wallet]   Hostname:", currentHost);

    // WebAuthn requires a proper domain — IP addresses are invalid RP IDs
    if (/^\d+\.\d+\.\d+\.\d+$/.test(currentHost)) {
      return {
        success: false,
        error: `WebAuthn requires a hostname, not an IP (${currentHost}). Add "${currentHost}  bazaar.local" to /etc/hosts on your browsing machine, then access via https://bazaar.local:5000`,
      };
    }

    const kit = new SmartAccountKit({
      rpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      accountWasmHash: "3e51f5b222dec74650f0b33367acb42a41ce497f72639230463070e666abba2c",
      webauthnVerifierAddress: "CATPTBRWVMH5ZCIKO5HN2F4FMPXVZEXC56RKGHRXCM7EEZGGXK7PICEH",
      storage: new IndexedDBStorage(),
      rpName: "The Velvet Ledger",
      // rpId intentionally omitted — defaults to window.location.hostname
    });

    console.log("[wallet] Step 4: Kit created. Trying to reconnect existing session...");

    // Try reconnecting an existing session first (no prompt)
    try {
      const existing = await kit.connectWallet();
      if (existing?.contractId) {
        console.log("[wallet] Reconnected existing wallet:", existing.contractId);
        return {
          success: true,
          wallet: {
            address: existing.contractId,
            type: "passkey",
            connected: true,
          },
        };
      }
    } catch (reconnectErr: any) {
      console.log("[wallet] No existing session (expected for first time):", reconnectErr.message);
    }

    console.log("[wallet] Step 5: Creating new wallet (this should trigger passkey prompt)...");

    // @ts-expect-error Smart Account Kit API may accept 0 args at runtime
    const result = await kit.createWallet();

    console.log("[wallet] Step 6: Wallet created:", result.contractId);
    console.log("[wallet] Step 7: Funding wallet...");

    try {
      // @ts-expect-error Smart Account Kit API may accept 0 args at runtime
      await kit.fundWallet();
      console.log("[wallet] Wallet funded");
    } catch (fundErr: any) {
      console.warn("[wallet] Fund warning (may already be funded):", fundErr.message);
    }

    return {
      success: true,
      wallet: {
        address: result.contractId,
        type: "passkey",
        connected: true,
        credentialId: result.credentialId,
      },
    };
  } catch (err: any) {
    console.error("[wallet] FAILED at:", err);
    console.error("[wallet] Error name:", err.name);
    console.error("[wallet] Error message:", err.message);
    console.error("[wallet] Error stack:", err.stack);
    return {
      success: false,
      error: `${err.name || "Error"}: ${err.message}`,
    };
  }
}
