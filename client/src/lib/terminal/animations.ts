// ═══════════════════════════════════════════════════════════════
// TERMINAL ANIMATION ENGINE
//
// Lightweight animation system for the terminal UI.
// Animations modify how lines render — overriding colors,
// swapping characters, or revealing text progressively.
// All animations are CSS/state-driven, no canvas.
// ═══════════════════════════════════════════════════════════════

export type AnimationType =
  | "rainbow"        // Color cycles through rainbow on text
  | "shimmer"        // Gold shimmer wave effect
  | "typewriter"     // Characters appear one by one
  | "spinner"        // Animated spinner character
  | "particles"      // Characters falling/rising
  | "reveal"         // Lines appear one at a time
  | "pulse"          // Color pulses between two values
  | "sparkle"        // Random characters briefly replaced with sparkle chars
  | "scroll_border"  // Border pattern shifts horizontally
  | "stamp"          // Flash bright then settle
  | "constellation"  // Stars blink into existence
  | "fireworks";     // Burst of characters

export interface Animation {
  id: string;
  type: AnimationType;
  startTime: number;
  duration: number;       // ms, 0 = infinite
  frameRate: number;      // ms per frame
  lineStart: number;      // first line index
  lineCount: number;      // number of lines affected
  config: AnimationConfig;
}

export interface AnimationConfig {
  palette?: string[];     // color hex values to cycle through
  text?: string;          // for typewriter: the text to reveal
  speed?: number;         // chars per frame for typewriter
  intensity?: number;     // 0-1 for effect intensity
  direction?: "left" | "right" | "up" | "down";
}

// ── Rainbow palette ─────────────────────────────────────────

const RAINBOW = [
  "#ff6b6b", "#ff9f43", "#ffd93d", "#6bcb77",
  "#4d96ff", "#9b59b6", "#e056a0",
];

const GOLD_SHIMMER = [
  "#8b6914", "#b8860b", "#d4a843", "#ffd700",
  "#d4a843", "#b8860b", "#8b6914",
];

const STELLAR_TEAL = [
  "#1a4040", "#2d6a6a", "#3d8b8b", "#5cb8a5",
  "#7dd4c0", "#5cb8a5", "#3d8b8b", "#2d6a6a",
];

const FIRE_COLORS = [
  "#ff0000", "#ff4500", "#ff6347", "#ff8c00",
  "#ffa500", "#ffd700", "#ffff00",
];

// ── Sparkle characters ──────────────────────────────────────

const SPARKLE_CHARS = ["*", ".", "+", ":", "'", "`", "~"];
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const BAZAAR_SPINNER = ["◜", "◝", "◞", "◟"];
const LAMP_FRAMES = ["🏮", "✦", "🏮", "✧"];

// ── Animation helpers ───────────────────────────────────────

/**
 * Get the current frame number for an animation
 */
export function getFrame(anim: Animation, now: number): number {
  const elapsed = now - anim.startTime;
  return Math.floor(elapsed / anim.frameRate);
}

/**
 * Check if an animation has expired
 */
export function isExpired(anim: Animation, now: number): boolean {
  if (anim.duration === 0) return false; // infinite
  return (now - anim.startTime) >= anim.duration;
}

/**
 * Get the rainbow color for a character position at a given frame
 */
export function getRainbowColor(charIndex: number, frame: number): string {
  const idx = (charIndex + frame) % RAINBOW.length;
  return RAINBOW[idx];
}

/**
 * Get the shimmer color for a position at a given frame
 */
export function getShimmerColor(charIndex: number, frame: number, palette?: string[]): string {
  const colors = palette ?? GOLD_SHIMMER;
  const wavePosition = (charIndex - frame * 2) % (colors.length * 3);
  const normalizedPos = ((wavePosition % colors.length) + colors.length) % colors.length;
  return colors[normalizedPos];
}

/**
 * Get pulse color between two colors based on frame
 */
export function getPulseColor(frame: number, color1: string, color2: string): string {
  return frame % 2 === 0 ? color1 : color2;
}

/**
 * Get a sparkle character for a position, or null if no sparkle this frame
 */
export function getSparkleChar(charIndex: number, frame: number, intensity: number = 0.1): string | null {
  // Pseudo-random based on position and frame
  const hash = (charIndex * 7 + frame * 13) % 100;
  if (hash < intensity * 100) {
    return SPARKLE_CHARS[hash % SPARKLE_CHARS.length];
  }
  return null;
}

/**
 * Get spinner character for current frame
 */
export function getSpinnerChar(frame: number, style: "dots" | "bazaar" | "lamp" = "dots"): string {
  const frames = style === "bazaar" ? BAZAAR_SPINNER
    : style === "lamp" ? LAMP_FRAMES
    : SPINNER_FRAMES;
  return frames[frame % frames.length];
}

/**
 * Get how many characters of text to show for typewriter effect
 */
export function getTypewriterLength(frame: number, speed: number = 2): number {
  return frame * speed;
}

/**
 * Get scroll offset for border pattern
 */
export function getScrollOffset(frame: number, direction: "left" | "right" = "right"): number {
  return direction === "right" ? frame : -frame;
}

/**
 * Generate constellation points for Stellar connection animation
 */
export function getConstellationPoints(frame: number, maxPoints: number = 20): { x: number; y: number; char: string }[] {
  const points: { x: number; y: number; char: string }[] = [];
  const visibleCount = Math.min(frame, maxPoints);

  for (let i = 0; i < visibleCount; i++) {
    // Deterministic "random" positions based on index
    const x = ((i * 7 + 3) % 50) + 5;
    const y = ((i * 13 + 7) % 5);
    const chars = ["*", ".", "+", "✦", "·"];
    const char = chars[i % chars.length];
    points.push({ x, y, char });
  }

  return points;
}

/**
 * Generate firework burst characters
 */
export function getFireworkChars(frame: number, centerX: number = 30): { x: number; y: number; char: string; color: string }[] {
  if (frame > 15) return []; // burst lasts 15 frames

  const chars: { x: number; y: number; char: string; color: string }[] = [];
  const radius = Math.min(frame * 2, 12);
  const count = 8;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.round(centerX + Math.cos(angle) * radius);
    const y = Math.round(2 + Math.sin(angle) * (radius / 3));
    const fadeChars = ["*", "+", ".", " "];
    const char = fadeChars[Math.min(Math.floor(frame / 4), fadeChars.length - 1)];
    const color = FIRE_COLORS[frame % FIRE_COLORS.length];
    chars.push({ x, y, char, color });
  }

  return chars;
}

/**
 * Generate gold cascade characters (coins falling)
 */
export function getGoldCascade(frame: number, width: number = 60): { x: number; char: string; color: string }[] {
  const chars: { x: number; char: string; color: string }[] = [];
  const coinChars = ["$", "¤", "*", "·", "°"];

  for (let col = 0; col < 3; col++) {
    const x = col === 0 ? 2 : col === 1 ? width - 3 : Math.round(width / 2);
    const charIdx = (frame + col * 3) % coinChars.length;
    chars.push({
      x,
      char: coinChars[charIdx],
      color: GOLD_SHIMMER[(frame + col) % GOLD_SHIMMER.length],
    });
  }

  return chars;
}

// ── Pre-built animation factories ───────────────────────────

let animIdCounter = 0;

function makeId(): string {
  return `anim-${++animIdCounter}`;
}

export function createRainbowAnimation(lineStart: number, lineCount: number, duration: number = 3000): Animation {
  return {
    id: makeId(),
    type: "rainbow",
    startTime: Date.now(),
    duration,
    frameRate: 100,
    lineStart,
    lineCount,
    config: { palette: RAINBOW },
  };
}

export function createShimmerAnimation(lineStart: number, lineCount: number, duration: number = 2000): Animation {
  return {
    id: makeId(),
    type: "shimmer",
    startTime: Date.now(),
    duration,
    frameRate: 80,
    lineStart,
    lineCount,
    config: { palette: GOLD_SHIMMER },
  };
}

export function createTypewriterAnimation(lineStart: number, text: string, speed: number = 2): Animation {
  const duration = (text.length / speed) * 50 + 500;
  return {
    id: makeId(),
    type: "typewriter",
    startTime: Date.now(),
    duration,
    frameRate: 50,
    lineStart,
    lineCount: 1,
    config: { text, speed },
  };
}

export function createSpinnerAnimation(lineStart: number): Animation {
  return {
    id: makeId(),
    type: "spinner",
    startTime: Date.now(),
    duration: 0, // infinite until removed
    frameRate: 120,
    lineStart,
    lineCount: 1,
    config: {},
  };
}

export function createPulseAnimation(lineStart: number, lineCount: number, color1: string, color2: string, duration: number = 0): Animation {
  return {
    id: makeId(),
    type: "pulse",
    startTime: Date.now(),
    duration,
    frameRate: 500,
    lineStart,
    lineCount,
    config: { palette: [color1, color2] },
  };
}

export function createSparkleAnimation(lineStart: number, lineCount: number, duration: number = 2000, intensity: number = 0.08): Animation {
  return {
    id: makeId(),
    type: "sparkle",
    startTime: Date.now(),
    duration,
    frameRate: 100,
    lineStart,
    lineCount,
    config: { intensity },
  };
}

export function createRevealAnimation(lineStart: number, lineCount: number, speed: number = 100): Animation {
  return {
    id: makeId(),
    type: "reveal",
    startTime: Date.now(),
    duration: lineCount * speed + 200,
    frameRate: speed,
    lineStart,
    lineCount,
    config: { speed },
  };
}

export function createStampAnimation(lineStart: number, lineCount: number): Animation {
  return {
    id: makeId(),
    type: "stamp",
    startTime: Date.now(),
    duration: 600,
    frameRate: 100,
    lineStart,
    lineCount,
    config: { palette: ["#ffffff", "#ffd700", "#d4a843"] },
  };
}

export function createConstellationAnimation(lineStart: number, lineCount: number): Animation {
  return {
    id: makeId(),
    type: "constellation",
    startTime: Date.now(),
    duration: 3000,
    frameRate: 150,
    lineStart,
    lineCount,
    config: { palette: STELLAR_TEAL },
  };
}

export function createFireworksAnimation(lineStart: number): Animation {
  return {
    id: makeId(),
    type: "fireworks",
    startTime: Date.now(),
    duration: 2000,
    frameRate: 80,
    lineStart,
    lineCount: 5,
    config: { palette: FIRE_COLORS },
  };
}

export function createScrollBorderAnimation(lineStart: number): Animation {
  return {
    id: makeId(),
    type: "scroll_border",
    startTime: Date.now(),
    duration: 0, // infinite
    frameRate: 200,
    lineStart,
    lineCount: 1,
    config: { direction: "right" },
  };
}

export function createGoldCascadeAnimation(lineStart: number, lineCount: number): Animation {
  return {
    id: makeId(),
    type: "particles",
    startTime: Date.now(),
    duration: 2000,
    frameRate: 100,
    lineStart,
    lineCount,
    config: { palette: GOLD_SHIMMER, direction: "down" },
  };
}

// ── Animation manager ───────────────────────────────────────

export class AnimationManager {
  private animations: Animation[] = [];
  private frameCallback: (() => void) | null = null;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;

  start(onFrame: () => void): void {
    this.frameCallback = onFrame;
    this.tick();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.frameCallback = null;
  }

  add(anim: Animation): void {
    this.animations.push(anim);
  }

  remove(id: string): void {
    this.animations = this.animations.filter(a => a.id !== id);
  }

  clear(): void {
    this.animations = [];
  }

  getActive(): Animation[] {
    const now = Date.now();
    this.animations = this.animations.filter(a => !isExpired(a, now));
    return this.animations;
  }

  hasAnimations(): boolean {
    return this.animations.length > 0;
  }

  /**
   * Get the color override for a specific character position in a line.
   * Returns null if no animation affects this position.
   */
  getColorAt(lineIndex: number, charIndex: number): string | null {
    const now = Date.now();

    for (const anim of this.animations) {
      if (isExpired(anim, now)) continue;
      if (lineIndex < anim.lineStart || lineIndex >= anim.lineStart + anim.lineCount) continue;

      const frame = getFrame(anim, now);

      switch (anim.type) {
        case "rainbow":
          return getRainbowColor(charIndex, frame);
        case "shimmer":
          return getShimmerColor(charIndex, frame, anim.config.palette);
        case "pulse":
          if (anim.config.palette && anim.config.palette.length >= 2) {
            return getPulseColor(frame, anim.config.palette[0], anim.config.palette[1]);
          }
          break;
        case "stamp": {
          const phase = Math.min(frame, (anim.config.palette?.length ?? 1) - 1);
          return anim.config.palette?.[phase] ?? "#ffffff";
        }
        case "constellation":
          return getShimmerColor(charIndex, frame, anim.config.palette);
      }
    }

    return null;
  }

  /**
   * Get character override for sparkle effect
   */
  getCharOverride(lineIndex: number, charIndex: number, originalChar: string): string | null {
    const now = Date.now();

    for (const anim of this.animations) {
      if (isExpired(anim, now)) continue;
      if (lineIndex < anim.lineStart || lineIndex >= anim.lineStart + anim.lineCount) continue;

      const frame = getFrame(anim, now);

      if (anim.type === "sparkle") {
        const sparkle = getSparkleChar(charIndex, frame, anim.config.intensity);
        if (sparkle && originalChar !== " ") return sparkle;
      }
    }

    return null;
  }

  /**
   * Get how many lines should be visible for reveal animations
   */
  getRevealCount(lineStart: number): number | null {
    const now = Date.now();

    for (const anim of this.animations) {
      if (anim.type !== "reveal") continue;
      if (anim.lineStart !== lineStart) continue;
      if (isExpired(anim, now)) continue;

      const frame = getFrame(anim, now);
      return Math.min(frame + 1, anim.lineCount);
    }

    return null;
  }

  /**
   * Get spinner character if there's a spinner animation on this line
   */
  getSpinner(lineIndex: number): string | null {
    const now = Date.now();

    for (const anim of this.animations) {
      if (anim.type !== "spinner") continue;
      if (anim.lineStart !== lineIndex) continue;
      if (isExpired(anim, now)) continue;

      return getSpinnerChar(getFrame(anim, now), "bazaar");
    }

    return null;
  }

  private tick = (): void => {
    const now = Date.now();

    // Only update at ~30fps to avoid excessive re-renders
    if (now - this.lastFrameTime >= 33 && this.animations.length > 0) {
      this.lastFrameTime = now;

      // Clean expired
      this.animations = this.animations.filter(a => !isExpired(a, now));

      // Trigger re-render
      this.frameCallback?.();
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
