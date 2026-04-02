// ═══════════════════════════════════════════════════════════════
// THE VELVET LEDGER BAZAAR — Game Data & Types
// ═══════════════════════════════════════════════════════════════

export type RiskPosture = "cautious" | "balanced" | "reckless" | "theatrical";
export type AgentStatus = "idle" | "deployed" | "resting";
export type MissionStatus = "planning" | "in_progress" | "completed";

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
}

export interface GameState {
  day: number;
  cash: number;
  reputation: number;
  brandName: string;
  agents: Agent[];
  districts: District[];
  activeMissions: ActiveMission[];
  completedMissions: ActiveMission[];
  rumors: string[];
  dayPhase: "morning" | "planning" | "resolution" | "reports";
  eventLog: string[];
  dailyReport?: DailyReport;
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
        baseBudget: 30,
        baseReward: 55,
        riskLevel: 2,
        districtId: "velvet-steps",
      },
      {
        id: "vs-brand-campaign",
        name: "Luxury Brand Campaign",
        description: "Launch a tasteful campaign among the Steps' elite clientele. Expensive, but reputation gains are substantial.",
        type: "branding",
        baseBudget: 40,
        baseReward: 25,
        riskLevel: 3,
        districtId: "velvet-steps",
      },
      {
        id: "vs-investigate-rival",
        name: "Investigate Rival Claims",
        description: "A competing brand claims to source from 'ancient orchards.' Send someone to verify or debunk.",
        type: "investigation",
        baseBudget: 15,
        baseReward: 10,
        riskLevel: 2,
        districtId: "velvet-steps",
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
        baseBudget: 15,
        baseReward: 40,
        riskLevel: 4,
        districtId: "fungal-quarter",
      },
      {
        id: "fq-scout-routes",
        name: "Map New Trade Routes",
        description: "Send a scout to discover cheaper supply paths through the Quarter's labyrinth.",
        type: "scout",
        baseBudget: 10,
        baseReward: 20,
        riskLevel: 3,
        districtId: "fungal-quarter",
      },
      {
        id: "fq-counterfeit-probe",
        name: "Counterfeit Detection Sweep",
        description: "Investigate reports of fake goods flooding the Quarter. Could reveal a rival's scheme.",
        type: "investigation",
        baseBudget: 12,
        baseReward: 15,
        riskLevel: 3,
        districtId: "fungal-quarter",
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
        baseBudget: 25,
        baseReward: 50,
        riskLevel: 3,
        districtId: "festival-sprawl",
      },
      {
        id: "fs-parade-float",
        name: "Sponsor a Parade Float",
        description: "Put your brand on a float in the Festival Parade. Maximum visibility, maximum chaos.",
        type: "branding",
        baseBudget: 35,
        baseReward: 15,
        riskLevel: 4,
        districtId: "festival-sprawl",
      },
      {
        id: "fs-rumor-harvest",
        name: "Harvest Festival Gossip",
        description: "The Sprawl is the city's best source of rumors. Send someone to mingle, drink, and eavesdrop.",
        type: "scout",
        baseBudget: 8,
        baseReward: 5,
        riskLevel: 2,
        districtId: "festival-sprawl",
      },
    ],
  },
];

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
