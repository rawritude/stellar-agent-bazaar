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
  | { type: "APPLY_EVENT"; choice: number };

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

export function indented(indent: number, ...spans: (string | TerminalSpan)[]): TerminalLine {
  return {
    indent,
    spans: spans.map(s => typeof s === "string" ? { text: s } : s),
  };
}
