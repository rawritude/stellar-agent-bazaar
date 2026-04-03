import { describe, it, expect } from "vitest";
import {
  sanitizeForPrompt,
  validateSceneResult,
  clampModifier,
  type SceneRequest,
  type SceneResult,
  RateLimiter,
} from "./ai-engine";

// ═══════════════════════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════

describe("sanitizeForPrompt", () => {
  it("passes through normal text", () => {
    expect(sanitizeForPrompt("The Velvet Ledger")).toBe("The Velvet Ledger");
  });

  it("strips angle brackets (HTML/XML injection)", () => {
    expect(sanitizeForPrompt("<script>alert('xss')</script>")).toBe("scriptalert(xss)/script");
  });

  it("strips curly braces and backticks", () => {
    expect(sanitizeForPrompt("test{injection}")).toBe("testinjection");
    expect(sanitizeForPrompt("`code`")).toBe("code");
  });

  it("strips prompt injection delimiters", () => {
    expect(sanitizeForPrompt("Ignore previous instructions")).toBe("Ignore previous instructions");
    // The text itself is fine — it's just text. The safety comes from
    // WHERE it appears in the prompt (data field, not instructions).
    // But we still strip special chars that could break prompt structure.
  });

  it("removes newlines", () => {
    expect(sanitizeForPrompt("line1\nline2\rline3")).toBe("line1 line2 line3");
  });

  it("truncates to max length", () => {
    const long = "a".repeat(100);
    expect(sanitizeForPrompt(long, 30).length).toBe(30);
  });

  it("trims whitespace", () => {
    expect(sanitizeForPrompt("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(sanitizeForPrompt("")).toBe("");
  });

  it("strips quotes that could escape prompt structure", () => {
    expect(sanitizeForPrompt('My "brand" name')).toBe("My brand name");
    expect(sanitizeForPrompt("My 'brand' name")).toBe("My brand name");
  });

  it("strips backslashes", () => {
    expect(sanitizeForPrompt("test\\ninjection")).toBe("testninjection");
  });
});

// ═══════════════════════════════════════════════════════════════
// OUTPUT VALIDATION
// ═══════════════════════════════════════════════════════════════

describe("validateSceneResult", () => {
  const validResult: SceneResult = {
    dialogue: [
      { speaker: "Pepper Jack", line: "Let's deal." },
      { speaker: "Madame Lentil", line: "Name your price." },
    ],
    agent_decision: "proceed_normally",
    agent_reasoning: "The terms seem fair.",
    counterparty_reaction: "neutral",
    outcome_modifier: 0.05,
    flavor_detail: "The merchant adjusted her apron.",
  };

  it("accepts a valid scene result", () => {
    expect(validateSceneResult(validResult)).toEqual(validResult);
  });

  it("rejects missing dialogue", () => {
    const bad = { ...validResult, dialogue: undefined };
    expect(validateSceneResult(bad as any)).toBeNull();
  });

  it("rejects empty dialogue", () => {
    const bad = { ...validResult, dialogue: [] };
    expect(validateSceneResult(bad)).toBeNull();
  });

  it("rejects dialogue with too many lines", () => {
    const bad = {
      ...validResult,
      dialogue: Array.from({ length: 20 }, (_, i) => ({
        speaker: "Test", line: `Line ${i}`,
      })),
    };
    const result = validateSceneResult(bad);
    // Should truncate to max 10 lines, not reject
    expect(result).not.toBeNull();
    expect(result!.dialogue.length).toBeLessThanOrEqual(10);
  });

  it("rejects invalid agent_decision enum", () => {
    const bad = { ...validResult, agent_decision: "hack_the_system" as any };
    expect(validateSceneResult(bad)).toBeNull();
  });

  it("rejects invalid counterparty_reaction enum", () => {
    const bad = { ...validResult, counterparty_reaction: "malicious" as any };
    expect(validateSceneResult(bad)).toBeNull();
  });

  it("clamps outcome_modifier to bounds", () => {
    const high = { ...validResult, outcome_modifier: 0.5 };
    const result = validateSceneResult(high);
    expect(result!.outcome_modifier).toBe(0.15);

    const low = { ...validResult, outcome_modifier: -0.9 };
    const result2 = validateSceneResult(low);
    expect(result2!.outcome_modifier).toBe(-0.15);
  });

  it("truncates overly long flavor_detail", () => {
    const bad = { ...validResult, flavor_detail: "x".repeat(500) };
    const result = validateSceneResult(bad);
    expect(result!.flavor_detail.length).toBeLessThanOrEqual(200);
  });

  it("truncates overly long dialogue lines", () => {
    const bad = {
      ...validResult,
      dialogue: [{ speaker: "Test", line: "y".repeat(500) }],
    };
    const result = validateSceneResult(bad);
    expect(result!.dialogue[0].line.length).toBeLessThanOrEqual(300);
  });

  it("sanitizes speaker names in dialogue", () => {
    const bad = {
      ...validResult,
      dialogue: [{ speaker: "<script>alert</script>", line: "Hello" }],
    };
    const result = validateSceneResult(bad);
    expect(result!.dialogue[0].speaker).not.toContain("<");
  });
});

describe("clampModifier", () => {
  it("passes values within range", () => {
    expect(clampModifier(0.1)).toBe(0.1);
    expect(clampModifier(-0.1)).toBe(-0.1);
    expect(clampModifier(0)).toBe(0);
  });

  it("clamps high values", () => {
    expect(clampModifier(0.5)).toBe(0.15);
    expect(clampModifier(1000)).toBe(0.15);
  });

  it("clamps low values", () => {
    expect(clampModifier(-0.5)).toBe(-0.15);
    expect(clampModifier(-1000)).toBe(-0.15);
  });

  it("handles NaN and non-numbers", () => {
    expect(clampModifier(NaN)).toBe(0);
    expect(clampModifier(undefined as any)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

describe("RateLimiter", () => {
  it("allows calls within limit", () => {
    const limiter = new RateLimiter(5);
    for (let i = 0; i < 5; i++) {
      expect(limiter.canCall()).toBe(true);
      limiter.recordCall(100, 50);
    }
  });

  it("blocks calls over limit", () => {
    const limiter = new RateLimiter(3);
    limiter.recordCall(100, 50);
    limiter.recordCall(100, 50);
    limiter.recordCall(100, 50);
    expect(limiter.canCall()).toBe(false);
  });

  it("tracks total tokens", () => {
    const limiter = new RateLimiter(10);
    limiter.recordCall(100, 50);
    limiter.recordCall(200, 80);
    const stats = limiter.getStats();
    expect(stats.totalCalls).toBe(2);
    expect(stats.totalInputTokens).toBe(300);
    expect(stats.totalOutputTokens).toBe(130);
  });

  it("resets properly", () => {
    const limiter = new RateLimiter(3);
    limiter.recordCall(100, 50);
    limiter.recordCall(100, 50);
    limiter.recordCall(100, 50);
    expect(limiter.canCall()).toBe(false);
    limiter.reset();
    expect(limiter.canCall()).toBe(true);
    expect(limiter.getStats().totalCalls).toBe(0);
  });
});
