import { useState } from "react";
import { useGame } from "@/lib/gameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACTION_TYPE_INFO, type ActionType, type SettlementMode } from "@/lib/gameData";
import type { SettlementReceipt } from "@/lib/settlement/types";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Zap,
  Hash,
  ExternalLink,
} from "lucide-react";

interface LedgerEntry {
  receipt: SettlementReceipt;
  agentName: string;
  agentEmoji: string;
  missionName: string;
  districtName: string;
  day: number;
}

const SETTLEMENT_BADGE: Record<SettlementMode, { label: string; className: string }> = {
  simulated: { label: "Simulated", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  testnet: { label: "Testnet", className: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400" },
};

const STATUS_ICON = {
  confirmed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  pending: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-500" />,
};

export function ReceiptLedger() {
  const { state } = useGame();
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<string>("all");

  // Collect all receipts from completed missions
  const entries: LedgerEntry[] = [];
  for (const mission of state.completedMissions) {
    if (!mission.result) continue;
    for (const step of mission.result.actionSteps) {
      if (!step.receipt) continue;
      entries.push({
        receipt: step.receipt,
        agentName: mission.agent.name,
        agentEmoji: mission.agent.emoji,
        missionName: mission.template.name,
        districtName: mission.district.name,
        day: mission.result.actionSteps.indexOf(step) === 0
          ? state.completedMissions.indexOf(mission) + 1
          : state.completedMissions.indexOf(mission) + 1,
      });
    }
  }

  // Apply filters
  const filtered = entries.filter(e => {
    if (filterAction !== "all" && e.receipt.actionType !== filterAction) return false;
    if (filterMode !== "all" && e.receipt.settlementMode !== filterMode) return false;
    return true;
  }).reverse(); // newest first

  // Aggregate stats
  const totalAmount = entries.reduce((sum, e) => sum + e.receipt.amount, 0);
  const totalFees = entries.reduce((sum, e) => sum + e.receipt.fee, 0);
  const confirmedCount = entries.filter(e => e.receipt.status === "confirmed").length;
  const failedCount = entries.filter(e => e.receipt.status === "failed").length;
  const simulatedCount = entries.filter(e => e.receipt.settlementMode === "simulated").length;
  const testnetCount = entries.filter(e => e.receipt.settlementMode === "testnet").length;

  return (
    <div className="space-y-4" data-testid="receipt-ledger">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Receipt Ledger</h2>
          <p className="text-sm text-muted-foreground">
            Every transaction, every fee, every dubious receipt — all in one place.
          </p>
        </div>
        <Badge variant="outline" className="text-xs tabular-nums gap-1">
          <BookOpen className="h-3 w-3" />
          {entries.length} receipts
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="hover-elevate cursor-default">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Volume</p>
            <p className="text-xl font-bold tabular-nums mt-1">{totalAmount}¤</p>
            <p className="text-xs text-muted-foreground">across {entries.length} txns</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fees Paid</p>
            <p className="text-xl font-bold tabular-nums mt-1 text-orange-600 dark:text-orange-400">{totalFees}¤</p>
            <p className="text-xs text-muted-foreground">network costs</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Confirmed</p>
            <p className="text-xl font-bold tabular-nums mt-1 text-green-600 dark:text-green-400">{confirmedCount}</p>
            <p className="text-xs text-muted-foreground">{failedCount} failed</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Simulated</p>
            <p className="text-xl font-bold tabular-nums mt-1 text-blue-600 dark:text-blue-400">{simulatedCount}</p>
            <p className="text-xs text-muted-foreground">local settlement</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-default">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Testnet</p>
            <p className="text-xl font-bold tabular-nums mt-1 text-teal-600 dark:text-teal-400">{testnetCount}</p>
            <p className="text-xs text-muted-foreground">on-chain</p>
          </CardContent>
        </Card>
      </div>

      {/* Testnet Readiness */}
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium">Settlement Ledger — Simulated → Stellar Testnet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each receipt below is structured for future on-chain settlement.
              When testnet mode is enabled, receipts will include Stellar transaction hashes
              and explorer links. The ledger tracks both modes side by side.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Filter:</span>
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_TYPE_INFO).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.emoji} {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Settlement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="simulated">Simulated</SelectItem>
            <SelectItem value="testnet">Testnet</SelectItem>
          </SelectContent>
        </Select>
        {(filterAction !== "all" || filterMode !== "all") && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {entries.length} shown
          </span>
        )}
      </div>

      {/* Receipt List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No Receipts Yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {entries.length === 0
                ? "Dispatch missions and their settlement receipts will appear here."
                : "No receipts match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const actionInfo = ACTION_TYPE_INFO[entry.receipt.actionType];
            const settleBadge = SETTLEMENT_BADGE[entry.receipt.settlementMode];
            return (
              <Card
                key={entry.receipt.receiptId}
                className="transition-all hover-elevate"
                data-testid={`receipt-${entry.receipt.receiptId}`}
              >
                <CardContent className="py-2.5 px-4">
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className="mt-1 shrink-0">
                      {STATUS_ICON[entry.receipt.status]}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Top row: counterparty + action */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {entry.receipt.counterpartyName}
                        </span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 gap-0.5">
                          {actionInfo.emoji} {actionInfo.label}
                        </Badge>
                        <Badge className={`text-[9px] py-0 px-1 border-0 ${settleBadge.className}`}>
                          {settleBadge.label}
                        </Badge>
                      </div>

                      {/* Agent + mission context */}
                      <p className="text-xs text-muted-foreground">
                        {entry.agentEmoji} {entry.agentName} — {entry.missionName} ({entry.districtName})
                      </p>

                      {/* Memo */}
                      <p className="text-xs italic text-muted-foreground/80">
                        "{entry.receipt.memo}"
                      </p>

                      {/* Receipt ID + tx hash */}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Hash className="h-2.5 w-2.5" />
                          {entry.receipt.receiptId}
                        </span>
                        {entry.receipt.stellarTxId && (
                          entry.receipt.explorerUrl ? (
                            <a
                              href={entry.receipt.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono text-teal-600 dark:text-teal-400 hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              TX: {entry.receipt.stellarTxId.slice(0, 12)}...
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 font-mono text-teal-600 dark:text-teal-400">
                              TX: {entry.receipt.stellarTxId.slice(0, 12)}...
                            </span>
                          )
                        )}
                        <span>
                          {new Date(entry.receipt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{entry.receipt.amount}¤</p>
                      {entry.receipt.fee > 0 && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          +{entry.receipt.fee}¤ fee
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
