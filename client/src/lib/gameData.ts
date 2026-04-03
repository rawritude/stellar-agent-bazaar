// ═══════════════════════════════════════════════════════════════
// THE VELVET LEDGER BAZAAR — Game Data & Types
// Two-sided agent interaction model with counterparty network
// ═══════════════════════════════════════════════════════════════

export type RiskPosture = "cautious" | "balanced" | "reckless" | "theatrical";
export type AgentStatus = "idle" | "deployed" | "resting";
export type MissionStatus = "planning" | "in_progress" | "completed";

// ── Settlement Route ─────────────────────────────────────────
// How a transaction settles. "simulated" = local game logic.
// Future: "testnet" | "mainnet" for real Stellar transactions.
export type SettlementMode = "simulated" | "testnet";

// ── Action Types ─────────────────────────────────────────────
// Modular action categories agents perform through counterparties.
// Each maps to specific counterparty types and has chain-backable semantics.
export type ActionType =
  | "trade_execution"   // Buy/sell goods through a merchant
  | "paid_intel"        // Purchase information from a data vendor or rumor bureau
  | "permit_filing"     // Acquire permits/licenses from bureaucratic offices
  | "inspection"        // Quality/compliance checks through inspectors
  | "logistics"         // Route goods through logistics brokers
  | "brand_promotion"   // Marketing through event handlers or criers
  | "negotiation"       // Haggling sessions with guild offices or merchants
  | "sabotage_op";      // Covert operations through shadow brokers

// ── Counterparty / Market Node ──────────────────────────────
// The "other side" that agents interact with.
export type CounterpartyType =
  | "merchant"          // Buys/sells goods
  | "guild_office"      // Regulates trade, issues permits
  | "permit_desk"       // Bureaucratic permit processing
  | "rumor_bureau"      // Intel broker, sells market rumors
  | "logistics_broker"  // Handles shipping, routing, delivery
  | "inspector"         // Quality control, compliance audits
  | "data_vendor"       // Sells analytics & market data
  | "rival_handler"     // Competitor intelligence & sabotage services
  | "event_promoter";   // Festival sponsors, brand placement

export interface Counterparty {
  id: string;
  name: string;
  type: CounterpartyType;
  emoji: string;
  description: string;
  quirk: string;                  // Funny personality trait
  reliability: number;            // 0-1: how often they deliver as promised
  greedFactor: number;            // 0-1: how much they mark up / skim
  districtIds: string[];          // Which districts they operate in
  supportedActions: ActionType[]; // Which action types they handle
  reputation: number;             // Their standing in the market (0-100)
  settlementMode: SettlementMode; // How txns settle (simulated for now)
  mood: "cooperative" | "neutral" | "hostile" | "chaotic";
  interactionCount: number;       // How many times player has dealt with them
  trust: number;                  // Player trust level: -100 to +100
  priceModifier: number;          // How trust affects pricing: -0.2 to +0.3
  lastInteractionDay: number;     // Which day they last dealt with player
  refusesService: boolean;        // If trust is too low, they refuse
}

// ── Action Step ──────────────────────────────────────────────
// A single interaction within a mission resolution.
// Missions now produce a sequence of these showing the agent
// navigating the counterparty network.
export interface ActionStep {
  actionType: ActionType;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyEmoji: string;
  description: string;            // What happened in this step
  cost: number;                   // How much this step cost
  settlementMode: SettlementMode; // How this step settled
  success: boolean;               // Did this step succeed?
  stellarTxId?: string;           // Future: actual Stellar tx hash
  receipt?: import("./settlement/types").SettlementReceipt; // Settlement receipt
  scene?: {
    dialogue: { speaker: string; line: string }[];
    agent_decision: string;
    agent_reasoning: string;
    counterparty_reaction: string;
    outcome_modifier: number;
    flavor_detail: string;
    decision_point?: {
      prompt: string;
      option_a: { label: string; risk: number; outcome_modifier: number };
      option_b: { label: string; risk: number; outcome_modifier: number };
    };
  };
}

// ── Agent Memory & Opinions ─────────────────────────────────
// Agents remember past interactions and develop preferences.

export interface AgentOpinion {
  counterpartyId: string;
  trust: number;           // -100 to +100 — agent's personal feeling
  reason: string;          // Why they feel this way
}

export interface AgentMemory {
  opinions: AgentOpinion[];           // How agent feels about each counterparty
  refusals: string[];                 // Counterparty IDs agent refuses to work with
  favoriteDistrict?: string;          // District ID they prefer
  avoidDistrict?: string;             // District ID they avoid
  lastMissionDay: number;             // When they last worked
  personalityShifts: string[];        // Log of how personality changed
}

export interface Agent {
  id: string;
  name: string;
  title: string;
  emoji: string;
  specialty: string;
  description: string;
  quirk: string;
  haggleBonus: number;    // -20 to +30 — affects deal prices
  scoutBonus: number;     // -20 to +30 — affects intel quality
  charmBonus: number;     // -20 to +30 — affects reputation gains
  riskFactor: number;     // 0 to 1 — likelihood of wild outcomes
  costPerMission: number; // base pay
  status: AgentStatus;
  morale: number;         // 0-100
  missionsCompleted: number;
  memory: AgentMemory;    // Agent's memories and opinions
}

export interface District {
  id: string;
  name: string;
  emoji: string;
  description: string;
  flavor: string;
  dangerLevel: number;     // 1-5
  wealthLevel: number;     // 1-5
  reputationModifier: number;
  availableMissions: MissionTemplate[];
  rumors: string[];
  isUnlocked: boolean;
}

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  type: "trade" | "scout" | "diplomacy" | "sabotage" | "branding" | "investigation";
  baseBudget: number;
  baseReward: number;
  riskLevel: number;       // 1-5
  requiredSpecialty?: string;
  districtId: string;
  // NEW: which action types this mission involves (engine resolves these through counterparties)
  actionSequence: ActionType[];
}

export interface ActiveMission {
  id: string;
  template: MissionTemplate;
  agent: Agent;
  district: District;
  budget: number;
  riskPosture: RiskPosture;
  status: MissionStatus;
  result?: MissionResult;
}

export interface MissionResult {
  success: boolean;
  moneySpent: number;
  moneyEarned: number;
  netProfit: number;
  reputationChange: number;
  narrative: string;
  headline: string;
  details: string[];
  rumorGained?: string;
  sideEffect?: string;
  // NEW: counterparty interaction trail
  actionSteps: ActionStep[];       // Ordered record of who the agent dealt with
  primaryCounterparty?: string;    // Name of the main counterparty
  settlementSummary: SettlementMode; // Overall settlement mode for this mission
}

// ── Campaign & Events ───────────────────────────────────────

export type CampaignWeek = 1 | 2 | 3 | 4;

export interface ActiveEvent {
  id: string;
  name: string;
  description: string;
  type: "opportunity" | "crisis" | "rival" | "market_shift" | "story";
  daysRemaining: number;
  effects: EventEffect[];
  sourceRumor?: string;           // Which rumor triggered this event
}

export interface EventEffect {
  type: "price_modifier" | "danger_modifier" | "reputation_modifier"
    | "unlock_mission" | "counterparty_mood" | "agent_morale"
    | "cash_drain" | "rival_action";
  target?: string;                // District/counterparty/agent ID
  value: number;
  description: string;
}

export interface CampaignState {
  week: CampaignWeek;
  totalDays: number;              // Campaign length (default 30)
  rivalBrand?: string;            // Rival brand name (appears week 2)
  rivalReputation: number;        // Rival's reputation
  rivalCash: number;              // Rival's estimated cash
  milestones: string[];           // Achieved milestones
  upkeepPerDay: number;           // Daily cost (rent + agent salaries)
  isGameOver: boolean;
  gameOverReason?: string;
  hasWon: boolean;
}

// ── Mid-Mission Decision ────────────────────────────────────

export interface MissionDecisionPoint {
  id: string;
  stepIndex: number;              // Which action step this interrupts
  prompt: string;                 // What Hakim asks the player
  options: MissionDecisionOption[];
  resolved: boolean;
  chosenOption?: string;
}

export interface MissionDecisionOption {
  id: string;
  label: string;
  description: string;
  riskLevel: number;              // 1-5
  outcomeModifier: number;        // How this affects the step result
  moraleCost: number;             // Agent morale impact
  costModifier: number;           // Budget impact multiplier
}

export interface GameState {
  day: number;
  cash: number;
  reputation: number;
  brandName: string;
  agents: Agent[];
  districts: District[];
  counterparties: Counterparty[];
  activeMissions: ActiveMission[];
  completedMissions: ActiveMission[];
  rumors: string[];
  dayPhase: "morning" | "planning" | "resolution" | "reports";
  eventLog: string[];
  dailyReport?: DailyReport;
  networkStats: NetworkStats;
  // New systems
  campaign: CampaignState;
  activeEvents: ActiveEvent[];
  pendingDecisions: MissionDecisionPoint[];
  triggeredRandomEventIds: string[];
  pendingRandomEvent?: import("../lib/events/randomEvents").RandomEvent;
}

export interface NetworkStats {
  totalTransactions: number;
  simulatedTransactions: number;
  testnetTransactions: number;     // Always 0 for now — future
  counterpartiesUsed: number;
  favoriteCounterparty?: string;
}

export interface DailyReport {
  day: number;
  missionsRun: number;
  totalSpent: number;
  totalEarned: number;
  netChange: number;
  reputationChange: number;
  headlines: string[];
  rumors: string[];
  // NEW: counterparty network summary for the day
  counterpartiesEngaged: string[];  // Names of counterparties used today
  actionBreakdown: { action: ActionType; count: number }[]; // How many of each action type
}

// ═══════════════════════════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════════════════════════

export const INITIAL_AGENTS: Agent[] = [
  {
    id: "pepper-jack",
    name: "Pepper Jack",
    title: "Senior Haggler",
    emoji: "🌶️",
    specialty: "trade",
    description: "A relentless negotiator with a tongue sharper than imported cutlery. Gets better prices through sheer verbal endurance.",
    quirk: "Sometimes insults nobles mid-deal. Claims it's 'a technique.'",
    haggleBonus: 25,
    scoutBonus: -5,
    charmBonus: -10,
    riskFactor: 0.35,
    costPerMission: 8,
    status: "idle",
    morale: 85,
    missionsCompleted: 0,
    memory: { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] },
  },
  {
    id: "auntie-null",
    name: "Auntie Null",
    title: "Vibe Auditor",
    emoji: "🔮",
    specialty: "investigation",
    description: "Identifies scams, fake demand, and emotional manipulation with unsettling accuracy. Her audits are feared across all districts.",
    quirk: "Occasionally causes morale collapse with brutal honesty. 'The truth is a service,' she insists.",
    haggleBonus: 0,
    scoutBonus: 30,
    charmBonus: -15,
    riskFactor: 0.15,
    costPerMission: 12,
    status: "idle",
    morale: 70,
    missionsCompleted: 0,
    memory: { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] },
  },
  {
    id: "ledger-pup",
    name: "Ledger Pup 4",
    title: "Reconciliation Unit",
    emoji: "🐕",
    specialty: "scout",
    description: "An impossibly efficient logistics-tracking agent. Processes receipts at inhuman speed. The '4' implies three prior models didn't survive the market.",
    quirk: "Can be distracted by shiny stamps and embossed letterheads. Budget may go to collectibles.",
    haggleBonus: 5,
    scoutBonus: 20,
    charmBonus: 10,
    riskFactor: 0.25,
    costPerMission: 6,
    status: "idle",
    morale: 95,
    missionsCompleted: 0,
    memory: { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] },
  },
  {
    id: "marquis-samples",
    name: "The Marquis of Samples",
    title: "Brand Ambassador Extraordinaire",
    emoji: "🎩",
    specialty: "branding",
    description: "Flamboyant, expensive, and wildly effective at making your brand the talk of any district. Distributes samples with theatrical flair.",
    quirk: "May improvise catastrophically. Has been known to promise impossible prices during 'inspired moments.'",
    haggleBonus: -15,
    scoutBonus: -10,
    charmBonus: 30,
    riskFactor: 0.55,
    costPerMission: 20,
    status: "idle",
    morale: 100,
    missionsCompleted: 0,
    memory: { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] },
  },
  {
    id: "crow-sigma",
    name: "Crow Unit Sigma",
    title: "Intelligence Operative",
    emoji: "🐦‍⬛",
    specialty: "scout",
    description: "A gossip-gathering crow in a tiny waistcoat. Gathers rumors cheaply, with a confidence level that is unjustifiably high.",
    quirk: "Reports often contain editorializing. Has opinions about everything. Unjustified confidence about macroeconomics.",
    haggleBonus: -5,
    scoutBonus: 15,
    charmBonus: 5,
    riskFactor: 0.20,
    costPerMission: 4,
    status: "idle",
    morale: 90,
    missionsCompleted: 0,
    memory: { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] },
  },
];

// ═══════════════════════════════════════════════════════════════
// DISTRICTS
// ═══════════════════════════════════════════════════════════════

export const INITIAL_DISTRICTS: District[] = [
  {
    id: "velvet-steps",
    name: "The Velvet Steps",
    emoji: "🏛️",
    description: "The old-money district. Marble colonnades, silk awnings, and merchants who judge you by your embossing quality.",
    flavor: "Premium goods, high margins, terrible snobbery.",
    dangerLevel: 2,
    wealthLevel: 5,
    reputationModifier: 1.5,
    isUnlocked: true,
    rumors: [
      "A noble's daughter is collecting exotic teas. Prices climbing.",
      "The Velvet Steps Merchant Guild is considering a new entrance fee.",
    ],
    availableMissions: [
      {
        id: "vs-premium-trade",
        name: "Premium Goods Negotiation",
        description: "Negotiate bulk purchase of luxury items at the Steps' morning market. High margins, but the merchants are shrewd.",
        type: "trade",
        baseBudget: 25,
        baseReward: 50,
        riskLevel: 2,
        districtId: "velvet-steps",
        actionSequence: ["negotiation", "trade_execution", "logistics"],
      },
      {
        id: "vs-brand-campaign",
        name: "Luxury Brand Campaign",
        description: "Launch a tasteful campaign among the Steps' elite clientele. Expensive, but reputation gains are substantial.",
        type: "branding",
        baseBudget: 20,
        baseReward: 35,
        riskLevel: 3,
        districtId: "velvet-steps",
        actionSequence: ["permit_filing", "brand_promotion"],
      },
      {
        id: "vs-investigate-rival",
        name: "Investigate Rival Claims",
        description: "A competing brand claims to source from 'ancient orchards.' Send someone to verify or debunk.",
        type: "investigation",
        baseBudget: 12,
        baseReward: 30,
        riskLevel: 2,
        districtId: "velvet-steps",
        actionSequence: ["paid_intel", "inspection"],
      },
    ],
  },
  {
    id: "fungal-quarter",
    name: "The Fungal Quarter",
    emoji: "🍄",
    description: "Damp, aromatic, and deeply suspicious. The underground market where rare spices and dubious permits change hands.",
    flavor: "Cheap access, high risk, questionable legality.",
    dangerLevel: 4,
    wealthLevel: 2,
    reputationModifier: 0.7,
    isUnlocked: true,
    rumors: [
      "Someone's been selling counterfeit saffron near the third tunnel.",
      "The Permit Goblins are demanding 'morale tea tin' contributions again.",
    ],
    availableMissions: [
      {
        id: "fq-spice-run",
        name: "Underground Spice Run",
        description: "Source rare spices at below-market rates. The sellers are reliable-ish. The tunnels are not.",
        type: "trade",
        baseBudget: 18,
        baseReward: 45,
        riskLevel: 4,
        districtId: "fungal-quarter",
        actionSequence: ["paid_intel", "negotiation", "trade_execution"],
      },
      {
        id: "fq-scout-routes",
        name: "Map New Trade Routes",
        description: "Send a scout to discover cheaper supply paths through the Quarter's labyrinth.",
        type: "scout",
        baseBudget: 10,
        baseReward: 30,
        riskLevel: 3,
        districtId: "fungal-quarter",
        actionSequence: ["paid_intel", "logistics"],
      },
      {
        id: "fq-counterfeit-probe",
        name: "Counterfeit Detection Sweep",
        description: "Investigate reports of fake goods flooding the Quarter. Could reveal a rival's scheme.",
        type: "investigation",
        baseBudget: 10,
        baseReward: 28,
        riskLevel: 3,
        districtId: "fungal-quarter",
        actionSequence: ["inspection", "paid_intel"],
      },
    ],
  },
  {
    id: "festival-sprawl",
    name: "Festival Sprawl",
    emoji: "🎪",
    description: "A permanent carnival district where pop-up stalls compete for attention, and brand visibility is everything.",
    flavor: "High foot traffic, chaotic energy, reputation gold mine.",
    dangerLevel: 3,
    wealthLevel: 3,
    reputationModifier: 1.2,
    isUnlocked: true,
    rumors: [
      "Festival Week starts soon — stall permits will triple in price.",
      "A celebrity chef is looking for a 'brand partnership.' Bidding war expected.",
    ],
    availableMissions: [
      {
        id: "fs-popup-stall",
        name: "Pop-Up Stall Operation",
        description: "Open a temporary stall during peak foot traffic. Sales potential is enormous if you pick the right pitch.",
        type: "trade",
        baseBudget: 22,
        baseReward: 48,
        riskLevel: 3,
        districtId: "festival-sprawl",
        actionSequence: ["permit_filing", "trade_execution", "logistics"],
      },
      {
        id: "fs-parade-float",
        name: "Sponsor a Parade Float",
        description: "Put your brand on a float in the Festival Parade. Maximum visibility, maximum chaos.",
        type: "branding",
        baseBudget: 20,
        baseReward: 35,
        riskLevel: 4,
        districtId: "festival-sprawl",
        actionSequence: ["permit_filing", "brand_promotion", "negotiation"],
      },
      {
        id: "fs-rumor-harvest",
        name: "Harvest Festival Gossip",
        description: "The Sprawl is the city's best source of rumors. Send someone to mingle, drink, and eavesdrop.",
        type: "scout",
        baseBudget: 8,
        baseReward: 22,
        riskLevel: 2,
        districtId: "festival-sprawl",
        actionSequence: ["paid_intel"],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// COUNTERPARTIES — the simulated market services network
// Each has personality, district presence, and action support.
// Designed for future Stellar testnet backing (settlementMode).
// ═══════════════════════════════════════════════════════════════

export const INITIAL_COUNTERPARTIES: Counterparty[] = [
  {
    id: "madame-lentil",
    name: "Madame Lentil's Emporium",
    type: "merchant",
    emoji: "🧑‍🍳",
    description: "The premier spice and luxury goods merchant of the Velvet Steps. Knows the price of everything and the value of even more.",
    quirk: "Insists on tasting every product personally before agreeing to terms. This takes a while.",
    reliability: 0.85,
    greedFactor: 0.3,
    districtIds: ["velvet-steps", "festival-sprawl", "fungal-quarter"],
    supportedActions: ["trade_execution", "negotiation"],
    reputation: 78,
    settlementMode: "simulated",
    mood: "cooperative",
    interactionCount: 0,
  },
  {
    id: "guild-of-ledgers",
    name: "The Guild of Ledgers",
    type: "guild_office",
    emoji: "📜",
    description: "The bureaucratic heart of bazaar commerce. Issues permits, mediates disputes, and enforces trade regulations with glacial efficiency.",
    quirk: "Every form requires a form to request the form. They consider this 'streamlined.'",
    reliability: 0.95,
    greedFactor: 0.15,
    districtIds: ["velvet-steps", "fungal-quarter", "festival-sprawl"],
    supportedActions: ["permit_filing", "negotiation"],
    reputation: 90,
    settlementMode: "simulated",
    mood: "neutral",
    interactionCount: 0,
  },
  {
    id: "fungal-permits",
    name: "The Permit Goblins",
    type: "permit_desk",
    emoji: "👺",
    description: "Underground permit processors who operate in the Fungal Quarter. Fast, cheap, and only mildly corrupt.",
    quirk: "Accept 'expediting fees' in tea tins, stamps, and compliments about their filing system.",
    reliability: 0.6,
    greedFactor: 0.45,
    districtIds: ["fungal-quarter"],
    supportedActions: ["permit_filing", "inspection"],
    reputation: 35,
    settlementMode: "simulated",
    mood: "chaotic",
    interactionCount: 0,
  },
  {
    id: "whisper-network",
    name: "The Whisper Network",
    type: "rumor_bureau",
    emoji: "👂",
    description: "A shadowy collective of gossip brokers, barkeep informants, and crows-for-hire. Sells intel of varying reliability.",
    quirk: "Their 'premium tier' intel is just regular intel read in a more dramatic whisper.",
    reliability: 0.72,
    greedFactor: 0.25,
    districtIds: ["velvet-steps", "fungal-quarter", "festival-sprawl"],
    supportedActions: ["paid_intel"],
    reputation: 50,
    settlementMode: "simulated",
    mood: "cooperative",
    interactionCount: 0,
  },
  {
    id: "cart-and-mule",
    name: "Cart & Mule Logistics Co.",
    type: "logistics_broker",
    emoji: "🐪",
    description: "The city's most reliable (and only insured) freight operation. Moves goods between districts with reasonable speed.",
    quirk: "The lead mule, Gerald, has veto power over cargo he finds aesthetically displeasing.",
    reliability: 0.8,
    greedFactor: 0.2,
    districtIds: ["velvet-steps", "fungal-quarter", "festival-sprawl"],
    supportedActions: ["logistics"],
    reputation: 65,
    settlementMode: "simulated",
    mood: "cooperative",
    interactionCount: 0,
  },
  {
    id: "magnifying-order",
    name: "The Magnifying Order",
    type: "inspector",
    emoji: "🔍",
    description: "Independent quality inspectors who certify goods, audit inventories, and occasionally discover that your 'ancient spices' are from last Tuesday.",
    quirk: "Rate everything on a 47-point scale. Nobody knows why 47.",
    reliability: 0.9,
    greedFactor: 0.1,
    districtIds: ["velvet-steps", "fungal-quarter"],
    supportedActions: ["inspection"],
    reputation: 82,
    settlementMode: "simulated",
    mood: "neutral",
    interactionCount: 0,
  },
  {
    id: "crows-analytics",
    name: "Crows & Associates Data Bureau",
    type: "data_vendor",
    emoji: "📊",
    description: "A data analytics firm run by an improbably literate murder of crows. Tracks market prices, consumer sentiment, and rival brand activity.",
    quirk: "Reports come in two versions: 'Optimistic' and 'Realistic.' They charge more for Realistic.",
    reliability: 0.7,
    greedFactor: 0.35,
    districtIds: ["velvet-steps", "festival-sprawl"],
    supportedActions: ["paid_intel", "inspection"],
    reputation: 60,
    settlementMode: "simulated",
    mood: "neutral",
    interactionCount: 0,
  },
  {
    id: "shadow-desk",
    name: "The Shadow Desk",
    type: "rival_handler",
    emoji: "🕶️",
    description: "Competitive intelligence specialists. Will investigate rivals, spread counter-narratives, or 'acquire' competitor trade secrets for the right price.",
    quirk: "Communicates exclusively through notes slid under doors. Even when you're sitting right there.",
    reliability: 0.5,
    greedFactor: 0.5,
    districtIds: ["fungal-quarter", "festival-sprawl"],
    supportedActions: ["sabotage_op", "paid_intel"],
    reputation: 25,
    settlementMode: "simulated",
    mood: "hostile",
    interactionCount: 0,
  },
  {
    id: "festival-criers",
    name: "The Festival Criers Guild",
    type: "event_promoter",
    emoji: "📣",
    description: "Professional attention-getters who run parades, stall promotions, and brand activations at the Festival Sprawl. Volume is their value proposition.",
    quirk: "Their 'subtle campaign' option is just yelling at 60% volume instead of 100%.",
    reliability: 0.75,
    greedFactor: 0.3,
    districtIds: ["festival-sprawl", "velvet-steps"],
    supportedActions: ["brand_promotion", "negotiation"],
    reputation: 55,
    settlementMode: "simulated",
    mood: "cooperative",
    interactionCount: 0,
    trust: 0,
    priceModifier: 0,
    lastInteractionDay: 0,
    refusesService: false,
  },
];

// Map action types to human-readable labels and chain-readiness info
export const ACTION_TYPE_INFO: Record<ActionType, { label: string; emoji: string; chainReady: boolean; description: string }> = {
  trade_execution: {
    label: "Trade Execution",
    emoji: "💱",
    chainReady: true,
    description: "Asset exchange between parties. Future: Stellar DEX order or path payment.",
  },
  paid_intel: {
    label: "Paid Intel",
    emoji: "💡",
    chainReady: true,
    description: "Purchase of market intelligence. Future: micropayment via Stellar.",
  },
  permit_filing: {
    label: "Permit Filing",
    emoji: "📄",
    chainReady: true,
    description: "License or permit acquisition. Future: on-chain credential issuance.",
  },
  inspection: {
    label: "Inspection",
    emoji: "🔎",
    chainReady: false,
    description: "Quality or compliance verification. Future: oracle-backed attestation.",
  },
  logistics: {
    label: "Logistics",
    emoji: "📦",
    chainReady: true,
    description: "Goods movement and routing. Future: escrow-backed delivery confirmation.",
  },
  brand_promotion: {
    label: "Brand Promotion",
    emoji: "🎯",
    chainReady: false,
    description: "Marketing and brand visibility actions. Future: on-chain ad-spend tracking.",
  },
  negotiation: {
    label: "Negotiation",
    emoji: "🤝",
    chainReady: false,
    description: "Multi-round haggling sessions. Future: commit-reveal pricing protocol.",
  },
  sabotage_op: {
    label: "Sabotage Op",
    emoji: "💣",
    chainReady: false,
    description: "Covert competitive action. Future: anonymous Stellar payments.",
  },
};

// ── Counterparty interaction text templates ───────────────────
export const COUNTERPARTY_SUCCESS_LINES: Record<CounterpartyType, string[]> = {
  merchant: [
    "Haggled successfully — the merchant even smiled (rare)",
    "Secured a favorable trade. The merchant's assistant looked impressed.",
    "Closed the deal with a handshake and minimal eye-rolling.",
  ],
  guild_office: [
    "Paperwork approved with only two stamp-related delays.",
    "The guild clerk found your application 'refreshingly competent.'",
    "Permit issued. The line behind you erupted in jealous whispers.",
  ],
  permit_desk: [
    "Permit secured after 'voluntary' expediting contribution.",
    "The goblin clerk processed your form with suspicious speed.",
    "Permit acquired. Only slightly sticky.",
  ],
  rumor_bureau: [
    "Intel acquired. The source seemed unusually specific this time.",
    "Paid the informant. They whispered something genuinely useful for once.",
    "The rumor broker slid the envelope across with a theatrical wink.",
  ],
  logistics_broker: [
    "Goods dispatched via the express mule route. Gerald approved the cargo.",
    "Shipping arranged. Estimated delivery: before the spices go stale.",
    "Logistics locked in. Cart & Mule's insurance covers everything except 'acts of parrot.'",
  ],
  inspector: [
    "Inspection passed. Your goods scored 38/47 (that's excellent, apparently).",
    "The inspector seemed pleased. They made a note in their little book.",
    "Quality certified. The Magnifying Order's seal will boost credibility.",
  ],
  data_vendor: [
    "Market data received. The 'Realistic' version, as requested.",
    "Analytics report delivered. The crows outdid themselves.",
    "Consumer sentiment data acquired. Turns out, people like your brand.",
  ],
  rival_handler: [
    "Operation complete. The Shadow Desk left no traces (probably).",
    "Intel on the rival acquired. A note was slid under the door as confirmation.",
    "Competitor data in hand. The less you know about methods, the better.",
  ],
  event_promoter: [
    "Brand activation launched! The Criers hit 90% volume (their 'subtle' mode).",
    "Promotion deployed. Your brand name echoed through three plazas.",
    "Campaign running. Early crowd reactions: curious, intrigued, slightly deafened.",
  ],
};

export const COUNTERPARTY_FAILURE_LINES: Record<CounterpartyType, string[]> = {
  merchant: [
    "The merchant laughed at your offer and sold to someone else.",
    "Negotiation collapsed after an unfortunate comment about the merchant's inventory.",
    "Deal fell through. The merchant cited 'vibes' as the reason.",
  ],
  guild_office: [
    "Application denied. Reason: 'Form 7B-Subsection Q was filled in blue, not indigo.'",
    "The guild office 'lost' your paperwork. Coincidence, surely.",
    "Permit rejected. The clerk suggested 'trying again with better penmanship.'",
  ],
  permit_desk: [
    "The Permit Goblins rejected your application for 'insufficient enthusiasm.'",
    "Permit denied. They did keep the expediting fee though.",
    "Processing failed. The goblin blamed 'the machine' (it's a rubber stamp).",
  ],
  rumor_bureau: [
    "The informant took your money and delivered yesterday's news.",
    "Intel was... less than actionable. 'Something might happen somewhere' isn't helpful.",
    "The whisper network sold you a rumor you already knew.",
  ],
  logistics_broker: [
    "Gerald the mule rejected the cargo on aesthetic grounds.",
    "Shipping delayed. The cart hit a philosophical disagreement at a fork in the road.",
    "Logistics failed. Cart & Mule cited 'unprecedented mule fatigue.'",
  ],
  inspector: [
    "Inspection failed. Your goods scored 12/47 (that's catastrophic).",
    "The inspector found 'concerning irregularities' and charged you for the privilege.",
    "Quality check: not great. The inspector's frown was visible from across the district.",
  ],
  data_vendor: [
    "The analytics report was delivered in a format nobody can read.",
    "Data was outdated by three market cycles. The crows apologized (they didn't).",
    "Consumer sentiment data received: it's mostly complaints about your competitor.",
  ],
  rival_handler: [
    "The Shadow Desk's operative was recognized. Cover blown.",
    "Operation compromised. The rival now knows you're watching.",
    "The covert mission was... not covert. At all.",
  ],
  event_promoter: [
    "The Criers promoted your COMPETITOR's brand name. By accident. Allegedly.",
    "Campaign launched but the crowd was elsewhere. Bad timing.",
    "Promotion backfired. The criers' enthusiasm scared away customers.",
  ],
};

// ═══════════════════════════════════════════════════════════════
// EVENT TEMPLATES — for random events and mission narratives
// ═══════════════════════════════════════════════════════════════

export const POSITIVE_HEADLINES = [
  "Legendary deal secured — merchants are whispering your name",
  "Your brand just became the talk of the district",
  "Exclusive supplier access unlocked through sheer charm",
  "A grateful merchant offered a loyalty discount for next time",
  "Celebrity endorsement acquired (it was an accident, but still)",
  "Discovered a competitor's fake scarcity scheme — your credibility soars",
  "The rumor mill is working in your favor today",
  "A wholesaler's cousin tipped us off to a hidden surplus",
  "Your agent found a discount logistics route nobody else knows about",
];

export const NEGATIVE_HEADLINES = [
  "Your agent accidentally committed to 500 jars of haunted syrup",
  "A rival spread anti-brand slander. Reputation dinged.",
  "Surprise customs duty wiped out margins",
  "Your agent developed an ego problem and overpaid for everything",
  "A district banned your mascot. No, seriously.",
  "Fake urgency scam — your agent overpaid by a painful amount",
  "Spoilage incident. The cinnamon got wet. All of it.",
  "Your top agent got into an argument with a noble's parrot",
  "The mushroom inspectors found a 'violation.' Suspiciously timed.",
];

export const NEUTRAL_HEADLINES = [
  "Mission completed. Results: acceptable, slightly confusing.",
  "Your agent returned with receipts, excuses, and a complicated expression",
  "Nothing exploded. Nothing was spectacular. Budget survived.",
  "The market was quiet today. Suspiciously quiet.",
  "Your agent gathered intel of 'moderate reliability'",
  "Transaction complete. The merchant seemed satisfied. Maybe too satisfied.",
];

export const POSITIVE_DETAILS = [
  "Negotiated a 15% discount through sustained eye contact and uncomfortable silence.",
  "Found a supplier willing to give bulk rates for 'brand loyalty' (they just want friends).",
  "Discovered the premium goods were actually premium. What a day.",
  "Your brand's reputation opened doors that money alone couldn't.",
  "A well-timed compliment to the district magistrate smoothed over permit issues.",
  "Locals are asking where to buy your products. Brand awareness is working.",
  "Your agent made friends with the dock foreman. Shipping is now 20% cheaper here.",
];

export const NEGATIVE_DETAILS = [
  "Spent 30 minutes arguing with a merchant who turned out to be a mannequin.",
  "Your agent's 'negotiation technique' involved yelling. It didn't go well.",
  "Budget overrun after your agent discovered an 'unmissable' opportunity. It was missable.",
  "The 'premium spices' turned out to be aggressive potpourri.",
  "A competing brand undercut your prices by hiring a louder crier.",
  "Your agent got distracted by a stamp collection and forgot the actual mission.",
  "The permit office 'lost' our paperwork. Again.",
];

export const RUMORS = [
  "Cinnamon futures are rising. Someone's hoarding supply.",
  "The Velvet Steps Merchant Guild is planning a tariff increase.",
  "A new district is opening beyond the eastern wall. First movers will profit.",
  "Celebrity chef Brimstone Betty needs a new spice supplier.",
  "The Fungal Quarter's tunnel system connects to an undiscovered market.",
  "Festival Week will feature a 'Brand Battle Royale.' Prize money is substantial.",
  "A foreign delegation is arriving. They buy luxury goods at absurd markups.",
  "The mushroom inspectors are being bribed by a competitor. Watch your permits.",
  "Someone found ancient trade contracts in the old archives. Legal chaos incoming.",
  "The Parade Committee is accepting bribes for prime float positions.",
  "A merchant in the Fungal Quarter claims to have synthetic saffron. Game-changer or scam?",
  "District taxes are going up next week. Stock up now.",
  "The gossip crows report unusual activity near the southern gate.",
  "A rival brand's top agent just defected. They might be recruitable.",
  "The weather forecast says 'market-disrupting storms' within three days.",
];

export const SIDE_EFFECTS = [
  "Your agent accidentally started a fashion trend. +3 reputation.",
  "A rival noticed your agent's activity. They're watching now.",
  "Your agent befriended a street vendor. Free samples for life (probably).",
  "Local press covered your brand. Article was… mostly positive.",
  "Your agent's expense report includes 'morale refreshments.' Suspicious.",
  "A new competitor appeared in your favorite district.",
  "Your agent discovered a shortcut. Next mission here will be cheaper.",
  "A grateful customer left a review. It was effusive and slightly unhinged.",
  "Your agent accidentally insulted a diplomat. Minor international incident.",
  "A street performer composed a jingle about your brand. It's catchy.",
];
