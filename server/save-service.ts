// ═══════════════════════════════════════════════════════════════
// SAVE/LOAD SERVICE — Persist game state by wallet address
//
// Uses SQLite (already in the project) to store serialized
// game state. Players can resume where they left off by
// connecting with the same wallet.
// ═══════════════════════════════════════════════════════════════

import Database from "better-sqlite3";
import { resolve } from "path";

const DB_PATH = resolve(import.meta.dirname, "..", "data.db");

let db: Database.Database | null = null;

function getDB(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_saves (
        wallet TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        brand_name TEXT,
        day INTEGER DEFAULT 1,
        cash INTEGER DEFAULT 100,
        reputation INTEGER DEFAULT 0,
        saved_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

export interface SaveSummary {
  wallet: string;
  brandName: string;
  day: number;
  cash: number;
  reputation: number;
  savedAt: string;
}

/**
 * Save game state for a wallet address.
 */
export function saveGame(wallet: string, state: any): void {
  const db = getDB();
  const json = JSON.stringify(state);

  db.prepare(`
    INSERT INTO game_saves (wallet, state, brand_name, day, cash, reputation, saved_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(wallet) DO UPDATE SET
      state = excluded.state,
      brand_name = excluded.brand_name,
      day = excluded.day,
      cash = excluded.cash,
      reputation = excluded.reputation,
      saved_at = datetime('now')
  `).run(
    wallet,
    json,
    state.brandName || "Unknown",
    state.day || 1,
    state.cash || 0,
    state.reputation || 0,
  );
}

/**
 * Load game state for a wallet address.
 * Returns null if no save exists.
 */
export function loadGame(wallet: string): any | null {
  const db = getDB();
  const row = db.prepare("SELECT state FROM game_saves WHERE wallet = ?").get(wallet) as any;
  if (!row) return null;

  try {
    return JSON.parse(row.state);
  } catch {
    return null;
  }
}

/**
 * Check if a save exists for a wallet (without loading the full state).
 */
export function getSaveSummary(wallet: string): SaveSummary | null {
  const db = getDB();
  const row = db.prepare(
    "SELECT wallet, brand_name, day, cash, reputation, saved_at FROM game_saves WHERE wallet = ?"
  ).get(wallet) as any;

  if (!row) return null;

  return {
    wallet: row.wallet,
    brandName: row.brand_name,
    day: row.day,
    cash: row.cash,
    reputation: row.reputation,
    savedAt: row.saved_at,
  };
}

/**
 * Delete a save for a wallet.
 */
export function deleteSave(wallet: string): void {
  const db = getDB();
  db.prepare("DELETE FROM game_saves WHERE wallet = ?").run(wallet);
}
