import { createContext, useContext, useReducer, useCallback, useState, type ReactNode } from "react";
import {
  type GameState,
  type MissionTemplate,
  type RiskPosture,
  type Agent,
} from "./gameData";
import {
  createInitialState,
  dispatchMission,
  resolveDay,
  advanceDay,
  startPlanning,
} from "./gameEngine";
import type { SettlementAdapter } from "./settlement";
import type { WalletInfo } from "./wallet/smartAccount";
// WalletInfo type is: { address, type: "passkey"|"server", connected, credentialId? }

type GameAction =
  | { type: "START_GAME"; brandName: string }
  | { type: "START_PLANNING" }
  | { type: "DISPATCH_MISSION"; template: MissionTemplate; agentId: string; districtId: string; budget: number; riskPosture: RiskPosture }
  | { type: "RESOLVE_DAY_COMPLETE"; resolvedState: GameState }
  | { type: "ADVANCE_DAY" }
  | { type: "SET_AGENTS"; agents: Agent[] }
  | { type: "LOAD_GAME"; savedState: GameState }
  | { type: "APPLY_EVENT_EFFECTS"; effects: { type: string; value: number; target?: string }[] }
  | { type: "CLEAR_PENDING_EVENT" }
  | { type: "PURCHASE_ITEM"; itemId: string }
  | { type: "APPLY_QUEST_REWARD"; agentId: string; questName: string };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return createInitialState(action.brandName);
    case "START_PLANNING":
      return startPlanning(state);
    case "DISPATCH_MISSION":
      return dispatchMission(state, action.template, action.agentId, action.districtId, action.budget, action.riskPosture);
    case "RESOLVE_DAY_COMPLETE":
      return action.resolvedState;
    case "ADVANCE_DAY":
      return advanceDay(state);
    case "SET_AGENTS":
      return { ...state, agents: action.agents };
    case "LOAD_GAME":
      return action.savedState;
    case "CLEAR_PENDING_EVENT": {
      const eventId = state.pendingRandomEvent?.id;
      return {
        ...state,
        pendingRandomEvent: undefined,
        triggeredRandomEventIds: eventId
          ? [...(state.triggeredRandomEventIds || []), eventId]
          : (state.triggeredRandomEventIds || []),
      };
    }
    case "APPLY_EVENT_EFFECTS": {
      let newCash = state.cash;
      let newRep = state.reputation;
      const newRumors = [...state.rumors];
      let upkeepMod = 0;
      const agents = state.agents.map(a => ({ ...a }));

      for (const effect of action.effects) {
        switch (effect.type) {
          case "cash":
            newCash = Math.max(0, newCash + effect.value);
            break;
          case "reputation":
            newRep = Math.max(0, Math.min(100, newRep + effect.value));
            break;
          case "morale_all":
            agents.forEach(a => {
              a.morale = Math.max(10, Math.min(100, a.morale + effect.value));
            });
            break;
          case "unlock_rumor":
            if (effect.target && !newRumors.includes(effect.target)) {
              newRumors.push(effect.target);
            }
            break;
          case "counterparty_trust": {
            // handled separately if needed
            break;
          }
          case "upkeep_modifier":
            upkeepMod += effect.value;
            break;
          case "agent_stat": {
            // Boost a random agent's specialty stat
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            if (randomAgent.specialty === "trade") randomAgent.haggleBonus += effect.value;
            else if (randomAgent.specialty === "scout" || randomAgent.specialty === "investigation") randomAgent.scoutBonus += effect.value;
            else randomAgent.charmBonus += effect.value;
            break;
          }
        }
      }

      return {
        ...state,
        cash: newCash,
        reputation: newRep,
        rumors: newRumors.slice(-15),
        agents,
        campaign: upkeepMod ? {
          ...state.campaign,
          upkeepPerDay: (state.campaign?.upkeepPerDay ?? 8) + upkeepMod,
        } : state.campaign,
      };
    }
    case "PURCHASE_ITEM": {
      const shop = (state.campaign?.shop ?? []).map(item => {
        if (item.id !== action.itemId) return item;
        return { ...item, purchased: true };
      });
      const item = shop.find(i => i.id === action.itemId);
      if (!item) return state;

      let newCash = state.cash - item.cost;
      let newRep = state.reputation;
      const agents = state.agents.map(a => ({ ...a }));

      // Apply immediate effects
      switch (item.effect.type) {
        case "morale_boost":
          agents.forEach(a => { a.morale = Math.min(100, a.morale + item.effect.value); });
          break;
        case "rep_boost":
          newRep = Math.min(100, newRep + item.effect.value);
          break;
      }

      return {
        ...state,
        cash: newCash,
        reputation: newRep,
        agents,
        campaign: { ...state.campaign, shop },
      };
    }
    case "APPLY_QUEST_REWARD": {
      const quests = (state.campaign?.agentQuests ?? []).map(q => {
        if (q.agentId !== action.agentId || q.name !== action.questName) return q;
        return { ...q, completed: true };
      });
      const quest = quests.find(q => q.agentId === action.agentId && q.name === action.questName);
      if (!quest) return state;

      const agents = state.agents.map(a => {
        if (a.id !== action.agentId) return a;
        const updated = { ...a };
        switch (quest.reward.type) {
          case "stat_boost":
            if (a.specialty === "trade") updated.haggleBonus += quest.reward.value;
            else if (a.specialty === "scout" || a.specialty === "investigation") updated.scoutBonus += quest.reward.value;
            else updated.charmBonus += quest.reward.value;
            break;
          case "cost_reduction":
            updated.costPerMission = Math.max(1, a.costPerMission - quest.reward.value);
            break;
        }
        return updated;
      });

      return {
        ...state,
        agents,
        campaign: { ...state.campaign, agentQuests: quests },
      };
    }
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  resolveDayAsync: (adapter?: SettlementAdapter) => Promise<void>;
  isResolving: boolean;
  stellarAdapter: SettlementAdapter | null;
  setStellarAdapter: (adapter: SettlementAdapter | null) => void;
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;
  wallet: WalletInfo | null;
  setWallet: (wallet: WalletInfo | null) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, createInitialState("The Velvet Ledger"));
  const [isResolving, setIsResolving] = useState(false);
  const [stellarAdapter, setStellarAdapter] = useState<SettlementAdapter | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);

  const resolveDayAsync = useCallback(async (adapter?: SettlementAdapter) => {
    setIsResolving(true);
    try {
      const resolvedState = await resolveDay(state, adapter ?? stellarAdapter ?? undefined, aiEnabled, wallet?.address);
      dispatch({ type: "RESOLVE_DAY_COMPLETE", resolvedState });
    } finally {
      setIsResolving(false);
    }
  }, [state, stellarAdapter, aiEnabled, wallet]);

  return (
    <GameContext.Provider value={{ state, dispatch, resolveDayAsync, isResolving, stellarAdapter, setStellarAdapter, aiEnabled, setAiEnabled, wallet, setWallet }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be inside GameProvider");
  return ctx;
}
