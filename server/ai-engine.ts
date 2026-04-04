import Anthropic from "@anthropic-ai/sdk";
import { SCENE_SYSTEM_PROMPT, SCENE_TOOL, buildScenePrompt } from "./ai-prompts";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SceneRequest {
  agentName: string;
  agentTitle: string;
  agentDescription: string;
  agentQuirk: string;
  agentStatName: string;
  agentStatValue: number;
  counterpartyName: string;
  counterpartyType: string;
  counterpartyDescription: string;
  counterpartyQuirk: string;
  counterpartyMood: string;
  counterpartyReliability: number;
  counterpartyGreed: number;
  actionType: string;
  actionDescription: string;
  districtName: string;
  budget: number;
  posture: string;
  brandName: string;
  pastInteractions: number;
}

export interface DialogueLine {
  speaker: string;
  line: string;
}

export type AgentDecision =
  | "proceed_normally"
  | "push_harder"
  | "accept_terms"
  | "walk_away"
  | "improvise"
  | "investigate";

export type CounterpartyReaction =
  | "pleased"
  | "neutral"
  | "annoyed"
  | "impressed"
  | "suspicious";

export interface DecisionOption {
  label: string;
  risk: number;
  outcome_modifier: number;
}

export interface DecisionPoint {
  prompt: string;
  option_a: DecisionOption;
  option_b: DecisionOption;
}

export interface SceneResult {
  dialogue: DialogueLine[];
  agent_decision: AgentDecision;
  agent_reasoning: string;
  counterparty_reaction: CounterpartyReaction;
  outcome_modifier: number;
  flavor_detail: string;
  decision_point?: DecisionPoint;
}

export interface GenerateSceneResponse {
  scene: SceneResult | null;
  fromAI: boolean;
  error?: string;
  tokensUsed?: { input: number; output: number };
}

// ═══════════════════════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize user-provided text before including in prompt data fields.
 * Strips characters that could break prompt structure or inject instructions.
 */
export function sanitizeForPrompt(text: string, maxLength: number = 50): string {
  return text
    .replace(/[<>{}[\]\\`'"]/g, "")  // strip structural chars
    .replace(/[\n\r]/g, " ")          // newlines → spaces
    .slice(0, maxLength)
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT VALIDATION
// ═══════════════════════════════════════════════════════════════

const VALID_DECISIONS: AgentDecision[] = [
  "proceed_normally", "push_harder", "accept_terms",
  "walk_away", "improvise", "investigate",
];

const VALID_REACTIONS: CounterpartyReaction[] = [
  "pleased", "neutral", "annoyed", "impressed", "suspicious",
];

const MAX_MODIFIER = 0.15;

/**
 * Clamp outcome modifier to safe bounds.
 * Prevents the LLM from producing game-breaking values.
 */
export function clampModifier(value: any): number {
  if (typeof value !== "number" || isNaN(value)) return 0;
  return Math.max(-MAX_MODIFIER, Math.min(MAX_MODIFIER, value));
}

/**
 * Fuzzy-match an enum value: lowercase, strip whitespace/underscores,
 * and pick the closest match from the valid set.
 */
function fuzzyMatchEnum<T extends string>(value: any, valid: T[], fallback: T): T {
  if (typeof value !== "string") return fallback;
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, "_").trim();
  // Exact match first
  if (valid.includes(normalized as T)) return normalized as T;
  // Prefix match (e.g., "proceed" -> "proceed_normally")
  const prefixMatch = valid.find((v) => v.startsWith(normalized));
  if (prefixMatch) return prefixMatch;
  // Contains match (e.g., "walk" -> "walk_away")
  const containsMatch = valid.find((v) => v.includes(normalized) || normalized.includes(v));
  if (containsMatch) return containsMatch;
  return fallback;
}

/**
 * Try to extract JSON from a string that may contain markdown fences or prose.
 * Returns the parsed object, or null if extraction fails.
 */
export function extractJSON(text: string): any | null {
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : text.trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find a JSON object in the text
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Validate and sanitize the LLM's structured output.
 * Returns { scene, issues } where issues lists any corrections made.
 * Returns null scene only if the output is fundamentally unusable
 * (no dialogue at all).
 */
export function validateSceneResult(raw: any): SceneResult | null {
  // If raw is a string (shouldn't happen with tool_use, but just in case),
  // try to extract JSON from it
  if (typeof raw === "string") {
    raw = extractJSON(raw);
  }
  if (!raw || typeof raw !== "object") return null;

  // Validate dialogue — this is the one hard requirement
  let dialogueSource = raw.dialogue;
  // Handle cases where dialogue might be nested or named differently
  if (!Array.isArray(dialogueSource)) {
    dialogueSource = raw.lines ?? raw.dialog ?? raw.conversation;
  }
  if (!Array.isArray(dialogueSource) || dialogueSource.length === 0) return null;

  const dialogue: DialogueLine[] = dialogueSource
    .slice(0, 10)
    .filter((d: any) => d && typeof d.speaker === "string" && typeof d.line === "string")
    .map((d: any) => ({
      speaker: sanitizeForPrompt(d.speaker, 50),
      line: d.line.slice(0, 300),
    }));
  if (dialogue.length === 0) return null;

  // Fuzzy-match enums with sensible defaults instead of rejecting
  const agent_decision = fuzzyMatchEnum(
    raw.agent_decision, VALID_DECISIONS, "proceed_normally"
  );
  const counterparty_reaction = fuzzyMatchEnum(
    raw.counterparty_reaction, VALID_REACTIONS, "neutral"
  );

  // Validate optional decision point
  let decision_point: DecisionPoint | undefined;
  if (raw.decision_point && typeof raw.decision_point === "object") {
    const dp = raw.decision_point;
    if (dp.prompt && dp.option_a && dp.option_b &&
        typeof dp.option_a.label === "string" && typeof dp.option_b.label === "string") {
      decision_point = {
        prompt: typeof dp.prompt === "string" ? dp.prompt.slice(0, 150) : "",
        option_a: {
          label: dp.option_a.label.slice(0, 60),
          risk: clamp(Number(dp.option_a.risk) || 2, 1, 5),
          outcome_modifier: clampModifier(dp.option_a.outcome_modifier),
        },
        option_b: {
          label: dp.option_b.label.slice(0, 60),
          risk: clamp(Number(dp.option_b.risk) || 2, 1, 5),
          outcome_modifier: clampModifier(dp.option_b.outcome_modifier),
        },
      };
    }
  }

  return {
    dialogue,
    agent_decision,
    agent_reasoning: typeof raw.agent_reasoning === "string"
      ? raw.agent_reasoning.slice(0, 200)
      : (typeof raw.reasoning === "string" ? raw.reasoning.slice(0, 200) : ""),
    counterparty_reaction,
    outcome_modifier: clampModifier(raw.outcome_modifier),
    flavor_detail: typeof raw.flavor_detail === "string"
      ? raw.flavor_detail.slice(0, 200)
      : (typeof raw.detail === "string" ? raw.detail.slice(0, 200) : ""),
    decision_point,
  };
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

export class RateLimiter {
  private calls: number = 0;
  private inputTokens: number = 0;
  private outputTokens: number = 0;
  private maxCalls: number;

  constructor(maxCallsPerSession: number = 100) {
    this.maxCalls = maxCallsPerSession;
  }

  canCall(): boolean {
    return this.calls < this.maxCalls;
  }

  recordCall(inputTokens: number, outputTokens: number): void {
    this.calls++;
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
  }

  getStats() {
    return {
      totalCalls: this.calls,
      totalInputTokens: this.inputTokens,
      totalOutputTokens: this.outputTokens,
      remaining: this.maxCalls - this.calls,
    };
  }

  reset(): void {
    this.calls = 0;
    this.inputTokens = 0;
    this.outputTokens = 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK SCENE GENERATION
// ═══════════════════════════════════════════════════════════════

const FALLBACK_DIALOGUES: DialogueLine[][] = [
  [
    { speaker: "Agent", line: "I believe we can reach an arrangement that benefits both parties." },
    { speaker: "Counterparty", line: "Perhaps. Let me hear what you're proposing." },
    { speaker: "Agent", line: "Consider the terms — fair market value, plus a small sweetener for your trouble." },
    { speaker: "Counterparty", line: "Hmm. I've heard worse. Let's talk numbers." },
  ],
  [
    { speaker: "Agent", line: "The market's been volatile. We both know what that means for pricing." },
    { speaker: "Counterparty", line: "It means I should charge you more, obviously." },
    { speaker: "Agent", line: "Or it means we lock in a deal now before things shift further." },
  ],
  [
    { speaker: "Agent", line: "I've been authorized to make this worth your while." },
    { speaker: "Counterparty", line: "Everyone says that. Few deliver." },
    { speaker: "Agent", line: "Then let me be among the few. Here's what I have in mind." },
    { speaker: "Counterparty", line: "...Go on." },
  ],
];

/**
 * Generate a fallback scene when AI fails or is unavailable.
 * Uses the request context to personalize generic dialogue templates.
 */
export function buildFallbackScene(request: SceneRequest): SceneResult {
  const template = FALLBACK_DIALOGUES[
    Math.floor(Math.random() * FALLBACK_DIALOGUES.length)
  ];
  // Replace generic speaker names with actual character names
  const dialogue = template.map((line) => ({
    speaker: line.speaker === "Agent" ? request.agentName : request.counterpartyName,
    line: line.line,
  }));

  // Pick decision/reaction based on posture for slight variety
  const postureMap: Record<string, AgentDecision> = {
    aggressive: "push_harder",
    cautious: "proceed_normally",
    friendly: "accept_terms",
  };
  const agent_decision = postureMap[request.posture] ?? "proceed_normally";

  return {
    dialogue,
    agent_decision,
    agent_reasoning: `${request.agentName} reads the room and adapts.`,
    counterparty_reaction: "neutral",
    outcome_modifier: 0,
    flavor_detail: `The air in ${request.districtName} smells faintly of ozone and ambition.`,
  };
}

// ═══════════════════════════════════════════════════════════════
// AI SCENE GENERATOR
// ═══════════════════════════════════════════════════════════════

export class AISceneGenerator {
  private client: Anthropic | null = null;
  private limiter: RateLimiter;
  private model: string;

  constructor(maxCalls: number = 100) {
    this.limiter = new RateLimiter(maxCalls);
    this.model = "claude-haiku-4-5-20251001";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.limiter.canCall();
  }

  getStats() {
    return {
      available: this.isAvailable(),
      configured: this.client !== null,
      ...this.limiter.getStats(),
    };
  }

  /**
   * Generate a scene for a bazaar interaction.
   * Returns AI-generated scene if available, falls back to template if not.
   * Never throws — always returns a response with a usable scene.
   */
  async generateScene(request: SceneRequest): Promise<GenerateSceneResponse> {
    if (!this.client) {
      return {
        scene: buildFallbackScene(request),
        fromAI: false,
        error: "ANTHROPIC_API_KEY not configured (using fallback scene)",
      };
    }

    if (!this.limiter.canCall()) {
      return {
        scene: buildFallbackScene(request),
        fromAI: false,
        error: "Rate limit reached for this session (using fallback scene)",
      };
    }

    try {
      // Sanitize the only user-provided field
      const safeBrandName = sanitizeForPrompt(request.brandName, 30);

      const prompt = buildScenePrompt({
        ...request,
        brandName: safeBrandName,
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        system: SCENE_SYSTEM_PROMPT,
        tools: [SCENE_TOOL],
        tool_choice: { type: "tool", name: "scene_result" },
        messages: [{ role: "user", content: prompt }],
      });

      // Track usage
      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      this.limiter.recordCall(inputTokens, outputTokens);

      // Extract tool use result
      const toolBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (!toolBlock) {
        // Try to extract from text blocks as a last resort
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === "text"
        );
        if (textBlock) {
          const extracted = extractJSON(textBlock.text);
          if (extracted) {
            const validated = validateSceneResult(extracted);
            if (validated) {
              return {
                scene: validated,
                fromAI: true,
                tokensUsed: { input: inputTokens, output: outputTokens },
              };
            }
          }
        }
        return {
          scene: buildFallbackScene(request),
          fromAI: false,
          error: "No tool_use block in AI response; used fallback scene",
          tokensUsed: { input: inputTokens, output: outputTokens },
        };
      }

      // Validate the structured output
      const validated = validateSceneResult(toolBlock.input);
      if (!validated) {
        // Build a descriptive error explaining what went wrong
        const input = toolBlock.input as any;
        const issues: string[] = [];
        if (!input || typeof input !== "object") {
          issues.push("tool input is not an object");
        } else {
          if (!Array.isArray(input.dialogue) || input.dialogue.length === 0)
            issues.push("dialogue missing or empty");
          else {
            const validLines = input.dialogue.filter(
              (d: any) => d && typeof d.speaker === "string" && typeof d.line === "string"
            );
            if (validLines.length === 0) issues.push("no valid dialogue lines (missing speaker/line fields)");
          }
        }

        return {
          scene: buildFallbackScene(request),
          fromAI: false,
          error: `AI response failed validation: ${issues.join("; ") || "unknown structure issue"}. Used fallback scene.`,
          tokensUsed: { input: inputTokens, output: outputTokens },
        };
      }

      return {
        scene: validated,
        fromAI: true,
        tokensUsed: { input: inputTokens, output: outputTokens },
      };
    } catch (err: any) {
      return {
        scene: buildFallbackScene(request),
        fromAI: false,
        error: `AI call failed: ${err.message} (using fallback scene)`,
      };
    }
  }
}
