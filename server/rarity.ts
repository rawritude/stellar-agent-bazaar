// ═══════════════════════════════════════════════════════════════
// RARITY SYSTEM — Server-side randomness control
//
// All randomness decisions happen here, server-side.
// The client never sees the rolls or the ranges.
// The AI gets told what tier to generate, not the other way around.
// ═══════════════════════════════════════════════════════════════

export type RarityTier = "common" | "uncommon" | "rare" | "legendary";

export interface RarityConfig {
  tier: RarityTier;
  statMin: number;     // minimum peak stat for this tier
  statMax: number;     // maximum peak stat for this tier
  weaknessMin: number; // how negative the weak stats can be
  weaknessMax: number; // ceiling for weak stats
  costMin: number;     // agent fee range
  costMax: number;
  description: string; // what we tell the AI about this tier
}

const RARITY_CONFIGS: Record<RarityTier, RarityConfig> = {
  common: {
    tier: "common",
    statMin: 8,
    statMax: 14,
    weaknessMin: -10,
    weaknessMax: 5,
    costMin: 5,
    costMax: 9,
    description: "A regular bazaar operative. Competent but unremarkable. The kind of agent you'd find loitering near any market stall.",
  },
  uncommon: {
    tier: "uncommon",
    statMin: 15,
    statMax: 21,
    weaknessMin: -12,
    weaknessMax: 3,
    costMin: 10,
    costMax: 14,
    description: "A skilled specialist with a reputation in their field. Noticeably better than average, with a distinctive personality.",
  },
  rare: {
    tier: "rare",
    statMin: 22,
    statMax: 26,
    weaknessMin: -15,
    weaknessMax: 0,
    costMin: 14,
    costMax: 20,
    description: "An exceptional talent. Well-known in the bazaar. Their skills come with strong opinions and notable quirks.",
  },
  legendary: {
    tier: "legendary",
    statMin: 27,
    statMax: 30,
    weaknessMin: -18,
    weaknessMax: -5,
    costMin: 20,
    costMax: 28,
    description: "A living legend of the bazaar. Extraordinarily gifted but deeply eccentric. Working with them is both a privilege and an ordeal.",
  },
};

/**
 * Roll a rarity tier. Weighted distribution:
 * - Common:    60%
 * - Uncommon:  25%
 * - Rare:      12%
 * - Legendary:  3%
 */
export function rollRarity(): RarityTier {
  const r = Math.random() * 100;
  if (r < 3) return "legendary";
  if (r < 15) return "rare";
  if (r < 40) return "uncommon";
  return "common";
}

/**
 * Roll rarity for a set of agents.
 * Guarantees at least one uncommon+ if generating 3+ agents.
 */
export function rollAgentRarities(count: number): RarityTier[] {
  const rarities = Array.from({ length: count }, () => rollRarity());

  // Guarantee at least one agent is uncommon or better
  if (count >= 3 && rarities.every(r => r === "common")) {
    (rarities as RarityTier[])[Math.floor(Math.random() * count)] = "uncommon";
  }

  return rarities;
}

/**
 * Get the config for a rarity tier.
 */
export function getRarityConfig(tier: RarityTier): RarityConfig {
  return RARITY_CONFIGS[tier];
}

/**
 * Validate that a stat value falls within the expected range for a tier.
 * Clamps to the tier's range if out of bounds.
 */
export function clampToTier(value: number, tier: RarityTier, isStat: "peak" | "weakness" | "cost"): number {
  const config = RARITY_CONFIGS[tier];
  switch (isStat) {
    case "peak":
      return Math.max(config.statMin, Math.min(config.statMax, value));
    case "weakness":
      return Math.max(config.weaknessMin, Math.min(config.weaknessMax, value));
    case "cost":
      return Math.max(config.costMin, Math.min(config.costMax, value));
  }
}

// ═══════════════════════════════════════════════════════════════
// EVENT RARITY — same system for random events
// ═══════════════════════════════════════════════════════════════

export type EventSeverity = "minor" | "moderate" | "major" | "critical";

/**
 * Roll event severity for between-day events.
 * - Minor:    50% (small cash/rep effects)
 * - Moderate: 30% (meaningful choice)
 * - Major:    15% (game-changing moment)
 * - Critical:  5% (campaign-defining event)
 */
export function rollEventSeverity(): EventSeverity {
  const r = Math.random() * 100;
  if (r < 5) return "critical";
  if (r < 20) return "major";
  if (r < 50) return "moderate";
  return "minor";
}
