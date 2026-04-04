import type { RiskPosture } from "../gameData";

export type TerminalColor =
  | "gold"    // currency, brand, Hakim's speech
  | "teal"    // Stellar/settlement
  | "red"     // failures, danger
  | "green"   // success, profit
  | "dim"     // secondary text
  | "white"   // primary text
  | "purple"  // reputation, magic
  | "cyan"    // agent names, info
  | "orange"  // warnings, risk
  | "amber";  // highlighted choices

export interface TerminalSpan {
  text: string;
  color?: TerminalColor;
  bold?: boolean;
  italic?: boolean;
}

export interface TerminalLine {
  spans: TerminalSpan[];
  indent?: number;
  blank?: boolean;
  centered?: boolean;
  // CSS-rendered elements (bypass character rendering)
  cssTitle?: { text: string; color: TerminalColor; size?: string; glow?: boolean };
  cssDivider?: { color: TerminalColor; style?: "solid" | "dashed" | "dotted" };
  preBlock?: { text: string; color: TerminalColor; glow?: boolean }; // pre-formatted block (figlet etc.)
}

export interface TerminalChoice {
  key: string;
  label: string;
  action: string; // event name to dispatch
  data?: any;
  disabled?: boolean;
  disabledReason?: string;
}

export type TerminalScreen =
  | "splash"
  | "narrator_intro"
  | "name_brand"
  | "generating_agents"
  | "meet_agents"
  | "stellar_choice"
  | "stellar_connecting"
  | "morning_brief"
  | "choose_district"
  | "choose_mission"
  | "choose_agent"
  | "set_budget"
  | "set_posture"
  | "confirm_dispatch"
  | "dispatch_more"
  | "resolving"
  | "resolution_narrative"
  | "daily_report"
  | "advance_day"
  | "view_agents"
  | "view_network"
  | "view_ledger"
  | "view_rumors"
  | "view_nfts"
  | "minting_nft"
  | "mission_decision"
  | "resume_or_new"
  | "event_announcement"
  | "view_shop"
  | "game_won"
  | "game_lost";

export interface PendingDispatch {
  districtId?: string;
  missionId?: string;
  agentId?: string;
  budget?: number;
  riskPosture?: RiskPosture;
}

export interface TerminalState {
  screen: TerminalScreen;
  lines: TerminalLine[];
  choices: TerminalChoice[];
  textInput: boolean;
  textPrompt?: string;
  pending: PendingDispatch;
  agentPage: number; // for paginating agent intros
  missionPage: number; // for paginating mission results
  history: TerminalScreen[];
}

export type TerminalSideEffect =
  | { type: "START_GAME"; brandName: string }
  | { type: "START_PLANNING" }
  | { type: "DISPATCH_MISSION" }
  | { type: "RESOLVE_DAY" }
  | { type: "ADVANCE_DAY" }
  | { type: "CONNECT_STELLAR" }
  | { type: "CONNECT_PASSKEY" }
  | { type: "DISCONNECT_STELLAR" }
  | { type: "MINT_NFT" }
  | { type: "GENERATE_AGENTS"; brandName: string }
  | { type: "CHECK_SAVE" }
  | { type: "SAVE_GAME" }
  | { type: "LOAD_SAVE" }
  | { type: "APPLY_EVENT"; choice: number }
  | { type: "PURCHASE_ITEM"; itemId: string }
  | { type: "APPLY_QUEST_REWARD"; agentId: string; questName: string };

// Helper to build lines quickly
export function line(...spans: (string | TerminalSpan)[]): TerminalLine {
  return {
    spans: spans.map(s =>
      typeof s === "string" ? { text: s } : s
    ),
  };
}

export function span(text: string, color?: TerminalColor, bold?: boolean): TerminalSpan {
  return { text, color, bold };
}

export function blank(): TerminalLine {
  return { spans: [], blank: true };
}

/**
 * CSS-styled title (for subtitles, labels, small headings).
 * For big terminal-style titles, use figletTitle() instead.
 */
export function title(text: string, color: TerminalColor = "gold", size: string = "1.1em", glow: boolean = true): TerminalLine {
  return { spans: [], centered: true, cssTitle: { text, color, size, glow } };
}

/**
 * Generate a figlet-style ASCII art title. These look terminal-native.
 * Uses pre-rendered text (call generateFiglet on the server or at build time).
 */
/**
 * Render pre-formatted ASCII text as a single block (preserves alignment).
 * Used for figlet titles and other multi-line character art.
 */
export function figletBlock(asciiText: string, color: TerminalColor = "gold", glow: boolean = true): TerminalLine {
  return { spans: [], centered: true, preBlock: { text: asciiText, color, glow } };
}

export function divider(color: TerminalColor = "dim", style: "solid" | "dashed" | "dotted" = "solid"): TerminalLine {
  return { spans: [], cssDivider: { color, style } };
}

export function indented(indent: number, ...spans: (string | TerminalSpan)[]): TerminalLine {
  return {
    indent,
    spans: spans.map(s => typeof s === "string" ? { text: s } : s),
  };
}
