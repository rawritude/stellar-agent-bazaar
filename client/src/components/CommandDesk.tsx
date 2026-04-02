import { useGame } from "@/lib/gameContext";
import { getReputationTier, getCashTier } from "@/lib/gameEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  ArrowRight,
  Zap,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin,
  AlertTriangle,
  FileText,
  Network,
} from "lucide-react";

interface CommandDeskProps {
  onNavigate: (tab: string) => void;
}

export function CommandDesk({ onNavigate }: CommandDeskProps) {
  const { state, dispatch } = useGame();
  const repTier = getReputationTier(state.reputation);
  const cashTier = getCashTier(state.cash);

  const idleAgents = state.agents.filter(a => a.status === "idle");
  const deployedAgents = state.agents.filter(a => a.status === "deployed");
  const hasActiveMissions = state.activeMissions.length > 0;

  return (
    <div className="space-y-4" data-testid="command-desk">
      {/* Phase Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-phase">
                {state.dayPhase === "morning" && "☀️ Morning Brief"}
                {state.dayPhase === "planning" && "📋 Planning Phase"}
                {state.dayPhase === "resolution" && "⏳ Missions In Progress..."}
                {state.dayPhase === "reports" && "📊 End-of-Day Reports"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {state.dayPhase === "morning" && "Review your position, then begin planning your day's operations."}
                {state.dayPhase === "planning" && "Assign agents to missions. When ready, send them into the field."}
                {state.dayPhase === "resolution" && "Your agents are out in the districts. Results incoming..."}
                {state.dayPhase === "reports" && "Review what happened. Then advance to the next day."}
              </p>
            </div>
            <div className="flex gap-2">
              {state.dayPhase === "morning" && (
                <Button
                  onClick={() => { dispatch({ type: "START_PLANNING" }); onNavigate("missions"); }}
                  className="gap-2"
                  data-testid="button-start-planning"
                >
                  <PlayCircle className="h-4 w-4" /> Start Planning
                </Button>
              )}
              {state.dayPhase === "planning" && hasActiveMissions && (
                <Button
                  onClick={() => dispatch({ type: "RESOLVE_DAY" })}
                  className="gap-2"
                  data-testid="button-resolve-day"
                >
                  <Zap className="h-4 w-4" /> Resolve Day
                </Button>
              )}
              {state.dayPhase === "planning" && !hasActiveMissions && (
                <Button
                  onClick={() => onNavigate("missions")}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-go-missions"
                >
                  <ArrowRight className="h-4 w-4" /> Dispatch Missions
                </Button>
              )}
              {state.dayPhase === "reports" && (
                <Button
                  onClick={() => dispatch({ type: "ADVANCE_DAY" })}
                  className="gap-2"
                  data-testid="button-advance-day"
                >
                  <ArrowRight className="h-4 w-4" /> Next Day
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="hover-elevate cursor-default" data-testid="card-cash">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Treasury</p>
            <p className="text-xl font-bold tabular-nums mt-1">{cashTier.emoji} {state.cash}¤</p>
            <p className="text-xs text-muted-foreground">{cashTier.name}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default" data-testid="card-reputation">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Reputation</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className={`text-xl font-bold ${repTier.color}`}>{repTier.emoji} {state.reputation}</p>
              <p className="text-xs text-muted-foreground">/100</p>
            </div>
            <Progress value={state.reputation} className="h-1.5 mt-1.5" />
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default" data-testid="card-agents-summary">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Agents</p>
            <p className="text-xl font-bold mt-1">
              <Users className="h-4 w-4 inline mr-1" />
              {idleAgents.length} idle
            </p>
            <p className="text-xs text-muted-foreground">
              {deployedAgents.length} deployed · {state.agents.length} total
            </p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default" data-testid="card-missions-summary">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Missions</p>
            <p className="text-xl font-bold mt-1">
              <MapPin className="h-4 w-4 inline mr-1" />
              {state.activeMissions.length} active
            </p>
            <p className="text-xs text-muted-foreground">
              {state.completedMissions.length} completed all-time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Missions & Recent Events */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Active Missions */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Active Missions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {state.activeMissions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No missions dispatched yet. {state.dayPhase === "planning"
                  ? "Head to the Missions tab to assign agents."
                  : "Start planning to send your agents out."}
              </p>
            ) : (
              <div className="space-y-2">
                {state.activeMissions.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50" data-testid={`mission-active-${m.id}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{m.agent.emoji}</span>
                      <div>
                        <p className="text-sm font-medium">{m.agent.name}</p>
                        <p className="text-xs text-muted-foreground">{m.template.name} · {m.district.name}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{m.budget}¤ · {m.riskPosture}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-2" /> Event Log
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {state.eventLog.slice(-8).reverse().map((log, i) => (
                <p key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-2" data-testid={`event-log-${i}`}>
                  {log}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Status + Rumor */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Network Status Widget */}
        <Card className="border-dashed border-primary/20" data-testid="card-network-status">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Network className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wider">Market Network</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Txns</p>
                <p className="text-sm font-bold tabular-nums">{state.networkStats.totalTransactions}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nodes</p>
                <p className="text-sm font-bold tabular-nums">{state.networkStats.counterpartiesUsed}/{state.counterparties.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Settlement</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Simulated</p>
                </div>
              </div>
            </div>
            {state.networkStats.favoriteCounterparty && (
              <p className="text-xs text-muted-foreground mt-2">
                Top partner: <span className="font-medium text-foreground">{state.networkStats.favoriteCounterparty}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Rumor Peek */}
        {state.rumors.length > 0 && (
          <Card className="border-dashed border-chart-2/30">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Latest Rumor</p>
              <p className="text-sm italic" data-testid="text-latest-rumor">
                🐦‍⬛ "{state.rumors[state.rumors.length - 1]}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Daily Report Summary (when in reports phase) */}
      {state.dayPhase === "reports" && state.dailyReport && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold">Day {state.dailyReport.day} Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Earned</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {state.dailyReport.totalEarned}¤
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> {state.dailyReport.totalSpent}¤
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net</p>
                <p className={`text-sm font-bold ${state.dailyReport.netChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {state.dailyReport.netChange >= 0 ? "+" : ""}{state.dailyReport.netChange}¤
                </p>
              </div>
            </div>
            {state.dailyReport.headlines.map((h, i) => (
              <p key={i} className="text-xs border-l-2 border-primary/30 pl-2 mb-1">{h}</p>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1"
              onClick={() => onNavigate("reports")}
              data-testid="button-view-reports"
            >
              <FileText className="h-3 w-3" /> View Full Reports
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
