import { useState } from "react";
import { useGame } from "@/lib/gameContext";
import { getReputationTier, getCashTier } from "@/lib/gameEngine";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommandDesk } from "@/components/CommandDesk";
import { AgentRoster } from "@/components/AgentRoster";
import { DistrictMap } from "@/components/DistrictMap";
import { MissionComposer } from "@/components/MissionComposer";
import { DailyReport } from "@/components/DailyReport";
import { RumorTicker } from "@/components/RumorTicker";
import { MarketNetwork } from "@/components/MarketNetwork";
import { ReceiptLedger } from "@/components/ReceiptLedger";
import {
  LayoutDashboard,
  Users,
  Map,
  Send,
  FileText,
  Radio,
  Network,
  BookOpen,
} from "lucide-react";

export default function GamePage() {
  const { state } = useGame();
  const repTier = getReputationTier(state.reputation);
  const cashTier = getCashTier(state.cash);
  const [activeTab, setActiveTab] = useState("command");

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm" data-testid="header">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <VelvetLogo />
            <div>
              <h1 className="text-sm font-bold tracking-wide uppercase" data-testid="text-brand-name">
                {state.brandName}
              </h1>
              <p className="text-xs text-muted-foreground">Day {state.day} · {state.dayPhase}</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6" data-testid="stats-bar">
            <div className="text-right" data-testid="stat-cash">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Cash</p>
              <p className="text-sm font-bold tabular-nums">
                {cashTier.emoji} {state.cash}¤
              </p>
            </div>
            <div className="text-right" data-testid="stat-reputation">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Reputation</p>
              <p className={`text-sm font-bold ${repTier.color}`}>
                {repTier.emoji} {state.reputation}/100 <span className="text-xs font-normal text-muted-foreground">({repTier.name})</span>
              </p>
            </div>
            <div className="text-right" data-testid="stat-day">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Day</p>
              <p className="text-sm font-bold tabular-nums">{state.day}</p>
            </div>
            <div className="text-right" data-testid="stat-agents">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Agents</p>
              <p className="text-sm font-bold tabular-nums">
                {state.agents.filter(a => a.status === "idle").length}/{state.agents.length} idle
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-8 h-10" data-testid="tab-list">
            <TabsTrigger value="command" className="text-xs gap-1.5" data-testid="tab-command">
              <LayoutDashboard className="h-3.5 w-3.5" /> Command
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs gap-1.5" data-testid="tab-agents">
              <Users className="h-3.5 w-3.5" /> Agents
            </TabsTrigger>
            <TabsTrigger value="districts" className="text-xs gap-1.5" data-testid="tab-districts">
              <Map className="h-3.5 w-3.5" /> Districts
            </TabsTrigger>
            <TabsTrigger value="network" className="text-xs gap-1.5" data-testid="tab-network">
              <Network className="h-3.5 w-3.5" /> Network
            </TabsTrigger>
            <TabsTrigger value="missions" className="text-xs gap-1.5" data-testid="tab-missions">
              <Send className="h-3.5 w-3.5" /> Missions
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs gap-1.5" data-testid="tab-reports">
              <FileText className="h-3.5 w-3.5" /> Reports
            </TabsTrigger>
            <TabsTrigger value="ledger" className="text-xs gap-1.5" data-testid="tab-ledger">
              <BookOpen className="h-3.5 w-3.5" /> Ledger
            </TabsTrigger>
            <TabsTrigger value="rumors" className="text-xs gap-1.5" data-testid="tab-rumors">
              <Radio className="h-3.5 w-3.5" /> Rumors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="command">
            <CommandDesk onNavigate={setActiveTab} />
          </TabsContent>
          <TabsContent value="agents">
            <AgentRoster />
          </TabsContent>
          <TabsContent value="districts">
            <DistrictMap />
          </TabsContent>
          <TabsContent value="network">
            <MarketNetwork />
          </TabsContent>
          <TabsContent value="missions">
            <MissionComposer onMissionDispatched={() => {}} />
          </TabsContent>
          <TabsContent value="reports">
            <DailyReport />
          </TabsContent>
          <TabsContent value="ledger">
            <ReceiptLedger />
          </TabsContent>
          <TabsContent value="rumors">
            <RumorTicker />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function VelvetLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-label="Velvet Ledger Bazaar logo"
      className="shrink-0"
    >
      {/* Diamond shape */}
      <path
        d="M16 2 L28 16 L16 30 L4 16 Z"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
      />
      {/* Inner V */}
      <path
        d="M10 11 L16 23 L22 11"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Dot accent */}
      <circle cx="16" cy="8" r="1.5" fill="hsl(var(--chart-2))" />
    </svg>
  );
}
