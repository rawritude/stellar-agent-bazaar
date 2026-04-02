import { useGame } from "@/lib/gameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileText,
  Receipt,
  Star,
} from "lucide-react";

export function DailyReport() {
  const { state, dispatch } = useGame();

  // Get completed missions for display (latest day first)
  const recentMissions = [...state.completedMissions].reverse();

  return (
    <div className="space-y-4" data-testid="daily-report">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Mission Reports</h2>
          <p className="text-sm text-muted-foreground">
            The receipts, excuses, and dramatic narratives your agents brought back.
          </p>
        </div>
        {state.dayPhase === "reports" && (
          <Button
            onClick={() => dispatch({ type: "ADVANCE_DAY" })}
            className="gap-2"
            data-testid="button-next-day-reports"
          >
            <ArrowRight className="h-4 w-4" /> Next Day
          </Button>
        )}
      </div>

      {/* Day Summary Card */}
      {state.dailyReport && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Day {state.dailyReport.day} Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Missions</p>
                <p className="text-lg font-bold tabular-nums">{state.dailyReport.missionsRun}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Earned</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" /> {state.dailyReport.totalEarned}¤
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" /> {state.dailyReport.totalSpent}¤
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net P&L</p>
                <p className={`text-lg font-bold tabular-nums ${state.dailyReport.netChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {state.dailyReport.netChange >= 0 ? "+" : ""}{state.dailyReport.netChange}¤
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reputation</p>
                <p className={`text-lg font-bold tabular-nums flex items-center gap-1 ${state.dailyReport.reputationChange >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
                  <Star className="h-4 w-4" />
                  {state.dailyReport.reputationChange >= 0 ? "+" : ""}{state.dailyReport.reputationChange}
                </p>
              </div>
            </div>

            {/* Headlines */}
            <div className="space-y-1">
              {state.dailyReport.headlines.map((h, i) => (
                <p key={i} className="text-xs border-l-2 border-primary/30 pl-2">{h}</p>
              ))}
            </div>

            {/* New Rumors */}
            {state.dailyReport.rumors.length > 0 && (
              <div className="mt-3 rounded-md bg-muted/50 p-2">
                <p className="text-xs font-medium mb-1">Intel Gathered</p>
                {state.dailyReport.rumors.map((r, i) => (
                  <p key={i} className="text-xs italic text-muted-foreground">🐦‍⬛ {r}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Mission Reports */}
      {recentMissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No Reports Yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Dispatch some missions and reports will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recentMissions.map(mission => {
            const r = mission.result;
            if (!r) return null;
            return (
              <Card key={mission.id} className={`transition-all ${r.success ? "border-l-4 border-l-green-500/50" : "border-l-4 border-l-red-500/50"}`} data-testid={`report-${mission.id}`}>
                <CardContent className="py-3 px-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{mission.agent.emoji}</span>
                      <div>
                        <p className="text-sm font-bold flex items-center gap-1.5">
                          {r.success
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <XCircle className="h-4 w-4 text-red-500" />
                          }
                          {mission.agent.name} — {mission.template.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mission.district.emoji} {mission.district.name} · {mission.riskPosture} posture
                        </p>
                      </div>
                    </div>
                    <Badge variant={r.success ? "default" : "destructive"} className="text-xs">
                      {r.success ? "Success" : "Failed"}
                    </Badge>
                  </div>

                  {/* Headline */}
                  <p className="text-sm font-medium italic mb-2 px-2 py-1.5 rounded bg-muted/50" data-testid={`text-headline-${mission.id}`}>
                    "{r.headline}"
                  </p>

                  {/* Financials */}
                  <div className="grid grid-cols-3 gap-3 mb-2 text-center">
                    <div className="rounded bg-red-50 dark:bg-red-950/30 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Spent</p>
                      <p className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">{r.moneySpent}¤</p>
                    </div>
                    <div className="rounded bg-green-50 dark:bg-green-950/30 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Earned</p>
                      <p className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">{r.moneyEarned}¤</p>
                    </div>
                    <div className={`rounded p-2 ${r.netProfit >= 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                      <p className="text-[10px] text-muted-foreground uppercase">Net</p>
                      <p className={`text-sm font-bold tabular-nums ${r.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {r.netProfit >= 0 ? "+" : ""}{r.netProfit}¤
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    {r.details.map((d, i) => (
                      <p key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-2">{d}</p>
                    ))}
                  </div>

                  {/* Reputation */}
                  {r.reputationChange !== 0 && (
                    <p className={`text-xs mt-2 font-medium ${r.reputationChange > 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
                      {r.reputationChange > 0 ? "⬆" : "⬇"} Reputation {r.reputationChange > 0 ? "+" : ""}{r.reputationChange}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
