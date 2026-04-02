import { createContext, useContext, useReducer, type ReactNode } from "react";
import {
  type GameState,
  type MissionTemplate,
  type RiskPosture,
} from "./gameData";
import {
  createInitialState,
  dispatchMission,
  resolveDay,
  advanceDay,
  startPlanning,
} from "./gameEngine";

type GameAction =
  | { type: "START_GAME"; brandName: string }
  | { type: "START_PLANNING" }
  | { type: "DISPATCH_MISSION"; template: MissionTemplate; agentId: string; districtId: string; budget: number; riskPosture: RiskPosture }
  | { type: "RESOLVE_DAY" }
  | { type: "ADVANCE_DAY" };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return createInitialState(action.brandName);
    case "START_PLANNING":
      return startPlanning(state);
    case "DISPATCH_MISSION":
      return dispatchMission(state, action.template, action.agentId, action.districtId, action.budget, action.riskPosture);
    case "RESOLVE_DAY":
      return resolveDay(state);
    case "ADVANCE_DAY":
      return advanceDay(state);
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, createInitialState("The Velvet Ledger"));
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be inside GameProvider");
  return ctx;
}
