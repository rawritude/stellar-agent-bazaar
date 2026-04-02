import { useGame } from "@/lib/gameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Network,
  Info,
  Zap,
  Shield,
  TrendingUp,
} from "lucide-react";
import { ACTION_TYPE_INFO, type CounterpartyType, type SettlementMode } from "@/lib/gameData";

const COUNTERPARTY_TYPE_LABELS: Record<CounterpartyType, string> = {
  merchant: "Merchant",
  guild_office: "Guild Office",
  permit_desk: "Permit Desk",
  rumor_bureau: "Rumor Bureau",
  logistics_broker: "Logistics Broker",
  inspector: "Inspector",
  data_vendor: "Data Vendor",
  rival_handler: "Rival Handler",
  event_promoter: "Event Promoter",
};

const MOOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cooperative: { label: "Cooperative", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/40" },
  neutral: { label: "Neutral", color: "text-muted-foreground", bg: "bg-muted/50" },
  hostile: { label: "Hostile", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/40" },
  chaotic: { label: "Chaotic", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950/40" },
};

const SETTLEMENT_CONFIG: Record<SettlementMode, { label: string; color: string }> = {
  simulated: { label: "Simulated", color: "text-blue-600 dark:text-blue-400" },
  testnet: { label: "Stellar Testnet", color: "text-teal-600 dark:text-teal-400" },
};

export function MarketNetwork() {
  const { state } = useGame();

  return (
    <div className="space-y-4" data-testid="market-network">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Market Network</h2>
          <p className="text-sm text-muted-foreground">
            The counterparties, service desks, and dubious organizations your agents negotiate with.
          </p>
        </div>
        <Badge variant="outline" className="text-xs tabular-nums gap-1">
          <Network className="h-3 w-3" />
          {state.counterparties.length} nodes
        </Badge>
      </div>

      {/* Network Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="hover-elevate cursor-default" data-testid="stat-total-txns">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Transactions</p>
            <p className="text-xl font-bold tabular-nums mt-1">
              {state.networkStats.totalTransactions}
            </p>
            <p className="text-xs text-muted-foreground">all-time</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default" data-testid="stat-cps-used">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Counterparties</p>
            <p className="text-xl font-bold tabular-nums mt-1">
              {state.networkStats.counterpartiesUsed}/{state.counterparties.length}
            </p>
            <p className="text-xs text-muted-foreground">engaged</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default" data-testid="stat-settlement">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Settlement</p>
            <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">
              Simulated
            </p>
            <p className="text-xs text-muted-foreground">{state.networkStats.simulatedTransactions} txns</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default" data-testid="stat-favorite">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Partner</p>
            <p className="text-sm font-bold mt-1 truncate">
              {state.networkStats.favoriteCounterparty || "—"}
            </p>
            <p className="text-xs text-muted-foreground">most interactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Testnet Readiness Banner */}
      <Card className="border-dashed border-primary/30" data-testid="testnet-readiness">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium">Settlement Route: Simulated → Stellar Testnet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All {state.networkStats.totalTransactions} transactions are currently simulated locally.
              Each counterparty interaction is structured as a future on-chain action:
              payments settle as Stellar path payments, permits as credential issuance, and trade execution as DEX orders.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-muted-foreground">Simulated: {state.networkStats.simulatedTransactions}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-teal-500 opacity-40" />
                <span className="text-[10px] text-muted-foreground">Testnet: {state.networkStats.testnetTransactions} (future)</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">Stellar Ready</Badge>
        </CardContent>
      </Card>

      {/* Action Types Grid */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> Action Types
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(ACTION_TYPE_INFO).map(([key, info]) => (
              <div
                key={key}
                className="rounded-md border p-2 text-xs space-y-1"
                data-testid={`action-type-${key}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{info.emoji} {info.label}</span>
                  {info.chainReady ? (
                    <Badge variant="default" className="text-[9px] py-0 px-1">Chain ✓</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] py-0 px-1">Sim only</Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{info.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Counterparty Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.counterparties.map(cp => {
          const moodCfg = MOOD_CONFIG[cp.mood] || MOOD_CONFIG.neutral;
          const settleCfg = SETTLEMENT_CONFIG[cp.settlementMode];
          return (
            <Card
              key={cp.id}
              className="transition-all hover-elevate"
              data-testid={`card-counterparty-${cp.id}`}
            >
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label={cp.name}>{cp.emoji}</span>
                    <div>
                      <CardTitle className="text-sm font-bold">{cp.name}</CardTitle>
                      <p className="text-xs text-primary font-medium">{COUNTERPARTY_TYPE_LABELS[cp.type]}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${moodCfg.color}`}
                  >
                    {moodCfg.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{cp.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-muted-foreground w-14">Reliable</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500/70"
                        style={{ width: `${cp.reliability * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {Math.round(cp.reliability * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-muted-foreground w-14">Greed</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500/70"
                        style={{ width: `${cp.greedFactor * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {Math.round(cp.greedFactor * 100)}%
                    </span>
                  </div>
                </div>

                {/* Reputation */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rep</span>
                  <Progress value={cp.reputation} className="h-1 flex-1" />
                  <span className="text-xs font-mono tabular-nums">{cp.reputation}/100</span>
                </div>

                {/* Actions Supported */}
                <div className="flex flex-wrap gap-1">
                  {cp.supportedActions.map(action => {
                    const info = ACTION_TYPE_INFO[action];
                    return (
                      <Badge key={action} variant="secondary" className="text-[10px] py-0 px-1.5 gap-0.5">
                        {info.emoji} {info.label}
                      </Badge>
                    );
                  })}
                </div>

                {/* Districts + Settlement */}
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs text-muted-foreground">
                    {cp.districtIds.length} district{cp.districtIds.length > 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${cp.settlementMode === "simulated" ? "bg-blue-500" : "bg-teal-500"}`} />
                    <span className={`text-[10px] ${settleCfg.color}`}>{settleCfg.label}</span>
                  </div>
                </div>

                {/* Interactions */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{cp.interactionCount} interaction{cp.interactionCount !== 1 ? "s" : ""}</span>
                </div>

                {/* Quirk */}
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs italic text-muted-foreground">
                    ⚠️ {cp.quirk}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
