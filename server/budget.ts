// ═══════════════════════════════════════════════════════════════
// DAILY BUDGET TRACKER
//
// Tracks API costs per wallet address per day.
// When the daily limit ($0.25) is hit, the game pauses
// until the next UTC day.
//
// Pricing (Claude Haiku):
// - Input:  $0.80 per million tokens
// - Output: $4.00 per million tokens
// ═══════════════════════════════════════════════════════════════

const DAILY_LIMIT_CENTS = 25; // $0.25 = 25 cents

// Haiku pricing in cents per token
const INPUT_COST_PER_TOKEN = 0.00008;   // $0.80/MTok = $0.0000008/tok = 0.00008 cents/tok
const OUTPUT_COST_PER_TOKEN = 0.0004;   // $4.00/MTok = $0.000004/tok  = 0.0004 cents/tok

interface DailyUsage {
  date: string;            // YYYY-MM-DD UTC
  inputTokens: number;
  outputTokens: number;
  calls: number;
  costCents: number;       // running total in cents
}

// In-memory store keyed by wallet address
const usageMap = new Map<string, DailyUsage>();

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(walletAddress: string): DailyUsage {
  const today = todayUTC();
  const key = walletAddress || "anonymous";
  let usage = usageMap.get(key);

  // Reset if it's a new day
  if (!usage || usage.date !== today) {
    usage = { date: today, inputTokens: 0, outputTokens: 0, calls: 0, costCents: 0 };
    usageMap.set(key, usage);
  }

  return usage;
}

export function canSpend(walletAddress: string): { allowed: boolean; remaining: number; usage: DailyUsage } {
  const usage = getUsage(walletAddress);
  const remaining = Math.max(0, DAILY_LIMIT_CENTS - usage.costCents);
  return {
    allowed: usage.costCents < DAILY_LIMIT_CENTS,
    remaining: Math.round(remaining * 100) / 100,
    usage,
  };
}

export function recordSpend(walletAddress: string, inputTokens: number, outputTokens: number): DailyUsage {
  const usage = getUsage(walletAddress);
  usage.inputTokens += inputTokens;
  usage.outputTokens += outputTokens;
  usage.calls += 1;
  usage.costCents += inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
  usage.costCents = Math.round(usage.costCents * 10000) / 10000; // avoid float drift
  return usage;
}

export function getBudgetStatus(walletAddress: string): {
  date: string;
  calls: number;
  costCents: number;
  limitCents: number;
  remaining: number;
  allowed: boolean;
  resetsAt: string;
} {
  const usage = getUsage(walletAddress);
  const remaining = Math.max(0, DAILY_LIMIT_CENTS - usage.costCents);

  // Next midnight UTC
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    date: usage.date,
    calls: usage.calls,
    costCents: Math.round(usage.costCents * 100) / 100,
    limitCents: DAILY_LIMIT_CENTS,
    remaining: Math.round(remaining * 100) / 100,
    allowed: usage.costCents < DAILY_LIMIT_CENTS,
    resetsAt: tomorrow.toISOString(),
  };
}
