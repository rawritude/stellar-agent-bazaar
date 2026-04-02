import { useState } from "react";
import { useGame } from "@/lib/gameContext";
import { canAffordMission, getCounterpartiesForAction } from "@/lib/gameEngine";
import { ACTION_TYPE_INFO, type MissionTemplate, type RiskPosture, type Agent, type District } from "@/lib/gameData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  AlertCircle,
  Shield,
  Coins,
  ChevronRight,
  Network,
} from "lucide-react";

interface MissionComposerProps {
  onMissionDispatched: () => void;
}

const POSTURE_INFO: Record<RiskPosture, { label: string; emoji: string; description: string }> = {
  cautious: { label: "Cautious", emoji: "🛡️", description: "Lower budget burn, lower reward ceiling. Steady and safe." },
  balanced: { label: "Balanced", emoji: "⚖️", description: "Standard risk/reward ratio. The sensible default." },
  reckless: { label: "Reckless", emoji: "🔥", description: "Higher success chance but higher spend. Go big." },
  theatrical: { label: "Theatrical", emoji: "🎭", description: "Wild card. Higher chance of spectacular outcomes — good or bad." },
};

export function MissionComposer({ onMissionDispatched }: MissionComposerProps) {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedMission, setSelectedMission] = useState<MissionTemplate | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [budget, setBudget] = useState<number>(20);
  const [riskPosture, setRiskPosture] = useState<RiskPosture>("balanced");

  const idleAgents = state.agents.filter(a => a.status === "idle");
  const unlockedDistricts = state.districts.filter(d => d.isUnlocked);
  const isPlanning = state.dayPhase === "planning";

  function handleDispatch() {
    if (!selectedMission || !selectedAgent || !selectedDistrict) return;

    if (!canAffordMission(state, selectedMission, budget, selectedAgent)) {
      toast({
        title: "Insufficient funds",
        description: `Need ${budget + selectedAgent.costPerMission}¤ (${budget}¤ budget + ${selectedAgent.costPerMission}¤ agent fee). You have ${state.cash}¤.`,
        variant: "destructive",
      });
      return;
    }

    dispatch({
      type: "DISPATCH_MISSION",
      template: selectedMission,
      agentId: selectedAgent.id,
      districtId: selectedDistrict.id,
      budget,
      riskPosture,
    });

    toast({
      title: `${selectedAgent.name} deployed!`,
      description: `Sent to ${selectedDistrict.name} for "${selectedMission.name}" with ${budget}¤ budget.`,
    });

    // Reset selections
    setSelectedAgent(null);
    setSelectedMission(null);
    onMissionDispatched();
  }

  if (!isPlanning) {
    return (
      <div className="space-y-4" data-testid="mission-composer">
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Not in Planning Phase</p>
            <p className="text-xs text-muted-foreground mt-1">
              {state.dayPhase === "morning"
                ? "Start planning from the Command Desk to dispatch missions."
                : state.dayPhase === "reports"
                ? "Review your reports and advance to the next day to plan new missions."
                : "Missions are being resolved..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="mission-composer">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Mission Composer</h2>
          <p className="text-sm text-muted-foreground">
            Pick a district, choose a mission, assign an agent, set the budget and posture. Then send them in.
          </p>
        </div>
        <Badge variant="outline" className="tabular-nums">
          {state.cash}¤ available
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Step 1: District & Mission */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              Choose Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* District Selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">District</label>
              <Select
                value={selectedDistrict?.id || ""}
                onValueChange={id => {
                  const d = unlockedDistricts.find(d => d.id === id)!;
                  setSelectedDistrict(d);
                  setSelectedMission(null);
                }}
              >
                <SelectTrigger data-testid="select-district">
                  <SelectValue placeholder="Select a district..." />
                </SelectTrigger>
                <SelectContent>
                  {unlockedDistricts.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.emoji} {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mission List */}
            {selectedDistrict && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">Available Missions</label>
                {selectedDistrict.availableMissions.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMission(m); setBudget(m.baseBudget); }}
                    className={`w-full text-left p-2.5 rounded-md border transition-all ${
                      selectedMission?.id === m.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    data-testid={`button-mission-${m.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{m.name}</span>
                      <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs flex items-center gap-0.5">
                        <Coins className="h-3 w-3" /> {m.baseBudget}¤ suggested
                      </span>
                      <span className="text-xs flex items-center gap-0.5">
                        <Shield className="h-3 w-3" /> Risk {m.riskLevel}/5
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Agent */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              Assign Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {idleAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No available agents. All deployed.</p>
            ) : (
              idleAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`w-full text-left p-2.5 rounded-md border transition-all ${
                    selectedAgent?.id === agent.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                  data-testid={`button-agent-${agent.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{agent.name}</span>
                        <span className="text-xs text-muted-foreground">{agent.costPerMission}¤/mission</span>
                      </div>
                      <p className="text-xs text-primary">{agent.title}</p>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <span>Haggle: {agent.haggleBonus > 0 ? "+" : ""}{agent.haggleBonus}</span>
                        <span>Scout: {agent.scoutBonus > 0 ? "+" : ""}{agent.scoutBonus}</span>
                        <span>Charm: {agent.charmBonus > 0 ? "+" : ""}{agent.charmBonus}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Step 3: Budget & Posture */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              Set Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Budget Slider */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Budget</label>
                <span className="text-xs font-bold tabular-nums" data-testid="text-budget-amount">{budget}¤</span>
              </div>
              <Slider
                value={[budget]}
                onValueChange={([v]) => setBudget(v)}
                min={5}
                max={Math.min(state.cash - (selectedAgent?.costPerMission || 0), 80)}
                step={5}
                data-testid="slider-budget"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">5¤</span>
                <span className="text-[10px] text-muted-foreground">
                  {Math.min(state.cash - (selectedAgent?.costPerMission || 0), 80)}¤
                </span>
              </div>
            </div>

            {/* Risk Posture */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Risk Posture</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(POSTURE_INFO) as RiskPosture[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setRiskPosture(p)}
                    className={`text-left p-2 rounded-md border text-xs transition-all ${
                      riskPosture === p
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    data-testid={`button-posture-${p}`}
                  >
                    <span className="font-medium">{POSTURE_INFO[p].emoji} {POSTURE_INFO[p].label}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{POSTURE_INFO[p].description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary & Dispatch */}
            {selectedMission && selectedAgent && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs font-medium">Mission Summary</p>
                <p className="text-xs text-muted-foreground">
                  {selectedAgent.emoji} <span className="font-medium">{selectedAgent.name}</span> → {selectedDistrict?.emoji} {selectedDistrict?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mission: {selectedMission.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Budget: {budget}¤ + {selectedAgent.costPerMission}¤ fee = <span className="font-bold">{budget + selectedAgent.costPerMission}¤ total</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Posture: {POSTURE_INFO[riskPosture].emoji} {POSTURE_INFO[riskPosture].label}
                </p>
              </div>
            )}

            {/* Counterparty Route Preview */}
            {selectedMission && selectedDistrict && (
              <div className="rounded-md border border-primary/10 p-2.5 space-y-1.5" data-testid="counterparty-preview">
                <div className="flex items-center gap-1.5">
                  <Network className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Network Route Preview</span>
                </div>
                {(selectedMission.actionSequence || []).map((action, i) => {
                  const info = ACTION_TYPE_INFO[action];
                  const candidates = getCounterpartiesForAction(state.counterparties, action, selectedDistrict.id);
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground tabular-nums w-4">{i + 1}.</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 gap-0.5">
                        {info.emoji} {info.label}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-xs truncate">
                        {candidates.length > 0
                          ? candidates.map(c => `${c.emoji} ${c.name}`).join(" / ")
                          : "No local provider"
                        }
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Settlement: Simulated</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleDispatch}
              disabled={!selectedMission || !selectedAgent || !selectedDistrict}
              className="w-full gap-2"
              data-testid="button-dispatch"
            >
              <Send className="h-4 w-4" />
              Dispatch Mission
              {selectedMission && selectedAgent && (
                <span className="ml-1 tabular-nums">({budget + selectedAgent.costPerMission}¤)</span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Missions Summary */}
      {state.activeMissions.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-primary" />
              Dispatched Today ({state.activeMissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1.5">
              {state.activeMissions.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm" data-testid={`dispatched-${m.id}`}>
                  <span>{m.agent.emoji} {m.agent.name} → {m.district.emoji} {m.template.name}</span>
                  <Badge variant="secondary" className="text-xs">{m.budget}¤ · {m.riskPosture}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
