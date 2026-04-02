import { useGame } from "@/lib/gameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Brain, Sparkles, AlertTriangle, Heart } from "lucide-react";

export function AgentRoster() {
  const { state } = useGame();

  return (
    <div className="space-y-4" data-testid="agent-roster">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Agent Roster</h2>
          <p className="text-sm text-muted-foreground">
            Your team of specialists. Each has strengths, weaknesses, and a concerning lack of impulse control.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {state.agents.filter(a => a.status === "idle").length}/{state.agents.length} available
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.agents.map(agent => (
          <Card key={agent.id} className={`transition-all ${agent.status !== "idle" ? "opacity-60" : "hover-elevate"}`} data-testid={`card-agent-${agent.id}`}>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" role="img" aria-label={agent.name}>{agent.emoji}</span>
                  <div>
                    <CardTitle className="text-sm font-bold">{agent.name}</CardTitle>
                    <p className="text-xs text-primary font-medium">{agent.title}</p>
                  </div>
                </div>
                <Badge
                  variant={agent.status === "idle" ? "default" : agent.status === "deployed" ? "secondary" : "outline"}
                  className="text-xs capitalize"
                >
                  {agent.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <StatBar icon={<Briefcase className="h-3 w-3" />} label="Haggle" value={agent.haggleBonus} />
                <StatBar icon={<Brain className="h-3 w-3" />} label="Scout" value={agent.scoutBonus} />
                <StatBar icon={<Sparkles className="h-3 w-3" />} label="Charm" value={agent.charmBonus} />
                <StatBar icon={<AlertTriangle className="h-3 w-3" />} label="Risk" value={Math.round(agent.riskFactor * 100)} />
              </div>

              {/* Morale */}
              <div className="flex items-center gap-2">
                <Heart className={`h-3 w-3 ${agent.morale > 60 ? "text-green-500" : agent.morale > 30 ? "text-yellow-500" : "text-red-500"}`} />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Morale</span>
                    <span className="text-xs font-medium tabular-nums">{agent.morale}%</span>
                  </div>
                  <Progress value={agent.morale} className="h-1" />
                </div>
              </div>

              {/* Cost & Missions */}
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-xs text-muted-foreground">Cost: {agent.costPerMission}¤/mission</span>
                <span className="text-xs text-muted-foreground">{agent.missionsCompleted} missions</span>
              </div>

              {/* Quirk */}
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-xs italic text-muted-foreground">
                  ⚠️ {agent.quirk}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatBar({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const isPositive = value > 0;
  const normalized = Math.min(Math.abs(value), 50);
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs text-muted-foreground w-10">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isPositive ? "bg-green-500/70" : "bg-red-500/70"}`}
          style={{ width: `${normalized * 2}%` }}
        />
      </div>
      <span className={`text-xs font-mono tabular-nums ${isPositive ? "text-green-600 dark:text-green-400" : value < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
        {value > 0 ? "+" : ""}{value}
      </span>
    </div>
  );
}
