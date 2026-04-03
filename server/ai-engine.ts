import Anthropic from "@anthropic-ai/sdk";
import { SCENE_SYSTEM_PROMPT, SCENE_TOOL, buildScenePrompt } from "./ai-prompts";

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
 * Validate and sanitize the LLM's structured output.
 * Returns null if the output is fundamentally invalid.
 * Clamps/truncates values that are out of bounds.
 */
export function validateSceneResult(raw: any): SceneResult | null {
  if (!raw || typeof raw !== "object") return null;

  // Validate dialogue
  if (!Array.isArray(raw.dialogue) || raw.dialogue.length === 0) return null;
  const dialogue: DialogueLine[] = raw.dialogue
    .slice(0, 10)
    .filter((d: any) => d && typeof d.speaker === "string" && typeof d.line === "string")
    .map((d: any) => ({
      speaker: sanitizeForPrompt(d.speaker, 50),
      line: d.line.slice(0, 300),
    }));
  if (dialogue.length === 0) return null;

  // Validate enums
  if (!VALID_DECISIONS.includes(raw.agent_decision)) return null;
  if (!VALID_REACTIONS.includes(raw.counterparty_reaction)) return null;

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
    agent_decision: raw.agent_decision,
    agent_reasoning: typeof raw.agent_reasoning === "string"
      ? raw.agent_reasoning.slice(0, 200)
      : "",
    counterparty_reaction: raw.counterparty_reaction,
    outcome_modifier: clampModifier(raw.outcome_modifier),
    flavor_detail: typeof raw.flavor_detail === "string"
      ? raw.flavor_detail.slice(0, 200)
      : "",
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
   * Returns AI-generated scene if available, null if not.
   * Never throws — always returns a response.
   */
  async generateScene(request: SceneRequest): Promise<GenerateSceneResponse> {
    if (!this.client) {
      return { scene: null, fromAI: false, error: "ANTHROPIC_API_KEY not configured" };
    }

    if (!this.limiter.canCall()) {
      return { scene: null, fromAI: false, error: "Rate limit reached for this session" };
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
        return {
          scene: null,
          fromAI: true,
          error: "No tool_use in response",
          tokensUsed: { input: inputTokens, output: outputTokens },
        };
      }

      // Validate the structured output
      const validated = validateSceneResult(toolBlock.input);
      if (!validated) {
        return {
          scene: null,
          fromAI: true,
          error: "Response failed validation",
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
        scene: null,
        fromAI: false,
        error: `AI call failed: ${err.message}`,
      };
    }
  }
}
