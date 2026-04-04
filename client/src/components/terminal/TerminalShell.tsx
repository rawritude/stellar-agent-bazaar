import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useGame } from "@/lib/gameContext";
import { useTerminal } from "@/lib/terminal/useTerminal";
import { TERMINAL_COLORS, TERMINAL_BG, TERMINAL_FONT } from "@/lib/terminal/terminalColors";
import { getReputationTier } from "@/lib/gameEngine";
import { AnimationManager } from "@/lib/terminal/animations";
import { PANEL_SCREENS, ScreenLayout } from "./PanelLayouts";
import { cash as formatCash, getAgentRarity } from "@/lib/terminal/uiHelpers";
import type { TerminalLine as TLine, TerminalSpan, TerminalChoice } from "@/lib/terminal/terminalTypes";

// ═══════════════════════════════════════════════════════════════
// TERMINAL LINE RENDERER
// ═══════════════════════════════════════════════════════════════

function TerminalLineView({
  line,
  lineIndex,
  animManager,
}: {
  line: TLine;
  lineIndex: number;
  animManager?: AnimationManager;
}) {
  if (line.blank) {
    return <div style={{ height: "1.4em" }} />;
  }

  // CSS-rendered title — uses web-safe styling, always readable
  if (line.cssTitle) {
    const { text, color, size, glow } = line.cssTitle;
    const fontSize = size || "1.2em";
    const isLarge = parseFloat(fontSize) >= 1.4;
    return (
      <div style={{
        fontSize,
        fontWeight: "bold",
        color: TERMINAL_COLORS[color],
        textAlign: "center",
        padding: isLarge ? "8px 0" : "2px 0",
        textShadow: glow ? `0 0 8px ${TERMINAL_COLORS[color]}50, 0 0 16px ${TERMINAL_COLORS[color]}25` : undefined,
        letterSpacing: isLarge ? "0.2em" : "0.1em",
        textTransform: isLarge ? "uppercase" as const : undefined,
        fontFamily: TERMINAL_FONT,
      }}>
        {text}
      </div>
    );
  }

  // Pre-formatted text block (figlet titles — rendered as <pre> to preserve alignment)
  if (line.preBlock) {
    const { text, color, glow } = line.preBlock;
    return (
      <pre style={{
        color: TERMINAL_COLORS[color],
        textAlign: "center",
        margin: "4px 0",
        fontFamily: TERMINAL_FONT,
        fontSize: "0.85em",
        lineHeight: "1.1",
        textShadow: glow ? `0 0 6px ${TERMINAL_COLORS[color]}40` : undefined,
        overflow: "hidden",
      }}>
        {text}
      </pre>
    );
  }

  // CSS-rendered divider (clean, no characters)
  if (line.cssDivider) {
    const { color, style } = line.cssDivider;
    return (
      <div style={{
        borderTop: `1px ${style || "solid"} ${TERMINAL_COLORS[color]}40`,
        margin: "8px 20px",
      }} />
    );
  }

  // Check if this line should be hidden by a reveal animation
  if (animManager) {
    const revealCount = animManager.getRevealCount(lineIndex);
    if (revealCount !== null && lineIndex >= revealCount) {
      return <div style={{ height: "1.4em" }} />;
    }
  }

  // Check for spinner on this line
  const spinner = animManager?.getSpinner(lineIndex);

  let charOffset = 0;

  return (
    <div style={{
      paddingLeft: line.indent ? `${line.indent * 0.6}em` : undefined,
      textAlign: line.centered ? "center" : undefined,
    }}>
      {spinner && (
        <span style={{ color: TERMINAL_COLORS.amber, marginRight: "0.5em" }}>
          {spinner}
        </span>
      )}
      {line.spans.map((s, spanIdx) => {
        // If there's an active color animation, render char-by-char
        const hasColorAnim = animManager && animManager.hasAnimations();

        if (hasColorAnim) {
          const startOffset = charOffset;
          charOffset += s.text.length;

          return (
            <span key={spanIdx}>
              {s.text.split("").map((char, ci) => {
                const globalCharIdx = startOffset + ci;
                const animColor = animManager!.getColorAt(lineIndex, globalCharIdx);
                const charOverride = animManager!.getCharOverride(lineIndex, globalCharIdx, char);

                return (
                  <span
                    key={ci}
                    style={{
                      color: animColor ?? (s.color ? TERMINAL_COLORS[s.color] : TERMINAL_COLORS.white),
                      fontWeight: s.bold ? "bold" : undefined,
                      fontStyle: s.italic ? "italic" : undefined,
                      transition: "color 0.1s",
                    }}
                  >
                    {charOverride ?? char}
                  </span>
                );
              })}
            </span>
          );
        }

        charOffset += s.text.length;
        const spanColor = s.color ? TERMINAL_COLORS[s.color] : TERMINAL_COLORS.white;

        // Auto-link URLs (e.g. Stellar explorer links)
        if (s.text.includes("https://")) {
          const urlMatch = s.text.match(/(https:\/\/\S+)/);
          if (urlMatch) {
            const before = s.text.slice(0, urlMatch.index);
            const url = urlMatch[1];
            const after = s.text.slice((urlMatch.index ?? 0) + url.length);
            return (
              <span key={spanIdx} style={{ color: spanColor, fontWeight: s.bold ? "bold" : undefined }}>
                {before}
                <a href={url} target="_blank" rel="noopener noreferrer"
                   style={{ color: spanColor, textDecoration: "underline" }}>
                  {url}
                </a>
                {after}
              </span>
            );
          }
        }

        return (
          <span
            key={spanIdx}
            style={{
              color: spanColor,
              fontWeight: s.bold ? "bold" : undefined,
              fontStyle: s.italic ? "italic" : undefined,
            }}
          >
            {s.text}
          </span>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOADING SPINNER — bazaar-themed animated loader
// ═══════════════════════════════════════════════════════════════

const SPINNER_MESSAGES = [
  "The bazaar stirs...",
  "Consulting the ledger...",
  "Hakim adjusts his monocle...",
  "The spice lanes whisper...",
  "Counting coins...",
  "Decoding merchant signals...",
  "Gerald the mule is thinking...",
  "The crows are deliberating...",
];

const SPINNER_CHARS = ["◜", "◝", "◞", "◟"];
const LAMP_CHARS = ["✦", "✧", "✦", "·"];

function LoadingSpinner() {
  const [frame, setFrame] = useState(0);
  const [msgIndex] = useState(() => Math.floor(Math.random() * SPINNER_MESSAGES.length));

  useEffect(() => {
    const interval = setInterval(() => setFrame(f => f + 1), 150);
    return () => clearInterval(interval);
  }, []);

  const spinChar = SPINNER_CHARS[frame % SPINNER_CHARS.length];
  const lampChar = LAMP_CHARS[frame % LAMP_CHARS.length];
  const dots = ".".repeat((frame % 4));
  const msg = SPINNER_MESSAGES[msgIndex];

  // Animated bar
  const barWidth = 20;
  const pos = frame % (barWidth * 2);
  const bar = Array.from({ length: barWidth }, (_, i) => {
    const dist = Math.abs(i - (pos < barWidth ? pos : barWidth * 2 - pos));
    return dist === 0 ? "█" : dist === 1 ? "▓" : dist === 2 ? "▒" : "░";
  }).join("");

  return (
    <div style={{ fontSize: "0.85em" }}>
      <div style={{ color: TERMINAL_COLORS.amber, marginBottom: "4px" }}>
        <span style={{ color: TERMINAL_COLORS.gold }}>{lampChar} </span>
        {msg}{dots}
        <span style={{ color: TERMINAL_COLORS.gold }}> {spinChar}</span>
      </div>
      <div style={{ color: TERMINAL_COLORS.dim, letterSpacing: "1px" }}>
        <span style={{ color: TERMINAL_COLORS.amber }}>{bar}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL INPUT
// ═══════════════════════════════════════════════════════════════

function TerminalInput({
  choices,
  textInput,
  textPrompt,
  onChoice,
  onTextSubmit,
}: {
  choices: TerminalChoice[];
  textInput: boolean;
  textPrompt?: string;
  onChoice: (action: string, data?: any) => void;
  onTextSubmit: (value: string) => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (textInput) {
    return (
      <div style={{ borderTop: `1px solid ${TERMINAL_COLORS.dim}40`, padding: "12px 16px" }}>
        <div style={{ color: TERMINAL_COLORS.gold, fontSize: "0.85em", marginBottom: "8px" }}>
          {textPrompt || "Enter text:"}
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (text.trim()) {
              onTextSubmit(text.trim());
              setText("");
            }
          }}
          style={{ display: "flex", gap: "8px" }}
        >
          <span style={{ color: TERMINAL_COLORS.amber }}>{">"}</span>
          <input
            ref={inputRef}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={30}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: TERMINAL_COLORS.amber,
              fontFamily: TERMINAL_FONT,
              fontSize: "1em",
              caretColor: TERMINAL_COLORS.gold,
            }}
          />
        </form>
      </div>
    );
  }

  if (choices.length === 0) {
    return (
      <div style={{ borderTop: `1px solid ${TERMINAL_COLORS.dim}40`, padding: "12px 16px" }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ borderTop: `1px solid ${TERMINAL_COLORS.dim}40`, padding: "12px 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {choices.map(c => (
          <button
            key={c.key}
            onClick={() => !c.disabled && onChoice(c.action, c.data)}
            disabled={c.disabled}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              textAlign: "left",
              cursor: c.disabled ? "not-allowed" : "pointer",
              fontFamily: TERMINAL_FONT,
              fontSize: "0.9em",
              padding: "4px 8px",
              borderRadius: "2px",
              color: c.disabled ? TERMINAL_COLORS.dim : TERMINAL_COLORS.amber,
              transition: "background 0.1s",
            }}
            onMouseOver={e => {
              if (!c.disabled) (e.target as HTMLElement).style.background = `${TERMINAL_COLORS.amber}15`;
            }}
            onMouseOut={e => {
              (e.target as HTMLElement).style.background = "transparent";
            }}
          >
            <span style={{ color: TERMINAL_COLORS.gold, marginRight: "8px" }}>
              [{c.key === "enter" ? "ENTER" : c.key.toUpperCase()}]
            </span>
            {c.label}
            {c.disabled && c.disabledReason && (
              <span style={{ color: TERMINAL_COLORS.dim, marginLeft: "8px" }}>
                ({c.disabledReason})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATUS BAR
// ═══════════════════════════════════════════════════════════════

function StatusBar({ screen }: { screen: string }) {
  const { state, stellarAdapter, aiEnabled, wallet } = useGame();
  const rep = getReputationTier(state.reputation);
  const idle = state.agents.filter(a => a.status === "idle").length;

  // Don't show status bar on early onboarding screens
  const hideOn = ["splash", "narrator_intro", "name_brand", "stellar_choice", "stellar_connecting", "generating_agents"];
  if (hideOn.includes(screen)) return null;

  return (
    <div
      style={{
        borderBottom: `1px solid ${TERMINAL_COLORS.dim}40`,
        padding: "8px 16px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.8em",
        color: TERMINAL_COLORS.dim,
        flexWrap: "wrap",
        gap: "8px",
      }}
    >
      <span>
        <span style={{ color: TERMINAL_COLORS.gold }}>{state.brandName}</span>
      </span>
      <span>
        Day <span style={{ color: TERMINAL_COLORS.white }}>{state.day}</span>
      </span>
      <span>
        Cash: <span style={{ color: TERMINAL_COLORS.gold }}>{formatCash(state.cash)}</span>
      </span>
      <span>
        Rep: <span style={{ color: TERMINAL_COLORS.purple }}>{state.reputation}/100</span>
        <span style={{ color: TERMINAL_COLORS.dim }}> ({rep.name})</span>
      </span>
      <span>
        Agents: <span style={{ color: TERMINAL_COLORS.cyan }}>{idle}/{state.agents.length}</span> idle
      </span>
      <span>
        {wallet
          ? <><span style={{ color: TERMINAL_COLORS.teal }}>Stellar (Passkey)</span></>
          : stellarAdapter
          ? <><span style={{ color: TERMINAL_COLORS.teal }}>Stellar</span></>
          : <><span style={{ color: TERMINAL_COLORS.dim }}>Simulated</span></>
        }
      </span>
      {aiEnabled && (
        <span>
          <span style={{ color: TERMINAL_COLORS.purple }}>AI</span>
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SHELL
// ═══════════════════════════════════════════════════════════════

export function TerminalShell() {
  const { term, processAction, scrollRef, handleKeyDown } = useTerminal();
  const { state: gameState } = useGame();
  const shellRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);

  // Typewriter effect — reveal lines progressively on narrative screens
  const [revealedLines, setRevealedLines] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const prevLineCount = useRef(0);

  // ── Typewriter: story/narrative screens get progressive line reveal.
  // Panel screens are excluded (they render CSS layouts, not term.lines).
  // Loading screens are excluded (spinner must be visible immediately).
  const typewriterScreens = new Set([
    "narrator_intro",    // Hakim's opening monologue
    "stellar_choice",    // Cosmic Ledger introduction
    "meet_agents",       // Agent reveal (one at a time)
    "resume_or_new",     // Save game found prompt
    "event_announcement", // Random event story
    "game_won",          // Victory screen
    "game_lost",         // Defeat screen
  ]);

  useEffect(() => {
    if (typewriterScreens.has(term.screen) && term.lines.length > 3) {
      setRevealedLines(0);
      setIsTyping(true);
    } else {
      setRevealedLines(term.lines.length);
      setIsTyping(false);
    }
  }, [term.screen, term.lines]);

  // Timer to reveal lines
  useEffect(() => {
    if (!isTyping) return;
    if (revealedLines >= term.lines.length) {
      setIsTyping(false);
      return;
    }
    const timer = setTimeout(() => {
      setRevealedLines(r => r + 1);
    }, 60); // 60ms per line
    return () => clearTimeout(timer);
  }, [isTyping, revealedLines, term.lines.length]);

  // Skip typing on any keypress
  useEffect(() => {
    if (!isTyping) return;
    const skip = () => {
      setRevealedLines(term.lines.length);
      setIsTyping(false);
    };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("click", skip, { once: true });
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("click", skip);
    };
  }, [isTyping, term.lines.length]);

  // Animation manager — singleton for the terminal session
  const animManager = useMemo(() => new AnimationManager(), []);

  // Start animation loop
  useEffect(() => {
    animManager.start(() => forceUpdate(n => n + 1));
    return () => animManager.stop();
  }, [animManager]);

  // ── Animations: triggered on screen transitions ──────────────
  //
  // Three categories:
  //   Ambient    — infinite loops while on a screen (shimmer, constellation)
  //   Entrance   — brief flair when a screen appears (stamp, sparkle)
  //   Loading    — spinners for async operations
  //
  // Convention: each screen clears previous animations, then adds its own.

  useEffect(() => {
    const lc = term.lines.length;
    const now = Date.now();

    // Clear all animations on every screen change
    animManager.clear();

    switch (term.screen) {
      // ── SPLASH: gold shimmer on title (ambient, infinite) ──
      case "splash":
        if (lc > 0) {
          animManager.add({
            id: "splash-shimmer", type: "shimmer", startTime: now,
            duration: 0, frameRate: 80,
            lineStart: Math.max(0, lc - 8), lineCount: 4,
            config: { palette: ["#8b6914", "#b8860b", "#d4a843", "#ffd700", "#d4a843", "#b8860b"] },
          });
        }
        break;

      // ── NARRATOR INTRO: subtle gold shimmer on Hakim's portrait ──
      case "narrator_intro":
        animManager.add({
          id: "intro-shimmer", type: "shimmer", startTime: now,
          duration: 3000, frameRate: 100,
          lineStart: 0, lineCount: Math.min(8, lc),
          config: { palette: ["#8b6914", "#b8860b", "#d4a843", "#ffd700", "#d4a843", "#b8860b"] },
        });
        break;

      // ── STELLAR CHOICE (Cosmic Ledger): teal constellation on art ──
      case "stellar_choice":
        animManager.add({
          id: "ledger-constellation", type: "constellation", startTime: now,
          duration: 5000, frameRate: 150,
          lineStart: 0, lineCount: Math.min(12, lc),
          config: { palette: ["#1a4040", "#2d6a6a", "#3d8b8b", "#5cb8a5", "#7dd4c0"] },
        });
        break;

      // ── STELLAR CONNECTING: constellation + spinner (loading) ──
      case "stellar_connecting":
        animManager.add({
          id: "connect-constellation", type: "constellation", startTime: now,
          duration: 4000, frameRate: 150,
          lineStart: Math.max(0, lc - 5), lineCount: 3,
          config: { palette: ["#1a4040", "#2d6a6a", "#3d8b8b", "#5cb8a5", "#7dd4c0"] },
        });
        animManager.add({
          id: "connect-spinner", type: "spinner", startTime: now,
          duration: 0, frameRate: 120,
          lineStart: Math.max(0, lc - 2), lineCount: 1,
          config: {},
        });
        break;

      // ── MEET AGENTS: rarity-based animation on agent reveal ──
      case "meet_agents":
        if (term.agentPage > 0) {
          const agent = gameState.agents[term.agentPage - 1];
          if (agent) {
            const rarity = getAgentRarity(agent);
            const nameLineIdx = Math.max(0, lc - 15);

            if (rarity.label === "LEGENDARY") {
              animManager.add({
                id: "agent-rarity", type: "rainbow", startTime: now,
                duration: 4000, frameRate: 80,
                lineStart: nameLineIdx, lineCount: 3, config: {},
              });
              animManager.add({
                id: "agent-sparkle", type: "sparkle", startTime: now,
                duration: 4000, frameRate: 100,
                lineStart: nameLineIdx, lineCount: 5,
                config: { intensity: 0.12 },
              });
            } else if (rarity.label === "RARE") {
              animManager.add({
                id: "agent-rarity", type: "shimmer", startTime: now,
                duration: 3000, frameRate: 80,
                lineStart: nameLineIdx, lineCount: 3,
                config: { palette: ["#8b6914", "#b8860b", "#d4a843", "#ffd700", "#d4a843", "#b8860b"] },
              });
            } else if (rarity.label === "UNCOMMON") {
              animManager.add({
                id: "agent-rarity", type: "pulse", startTime: now,
                duration: 2500, frameRate: 400,
                lineStart: nameLineIdx, lineCount: 2,
                config: { palette: ["#5cb8a5", "#3d8b8b"] },
              });
            }
            // COMMON — no animation
          }
        }
        break;

      // ── GENERATING AGENTS: spinner (loading) ──
      case "generating_agents":
        animManager.add({
          id: "gen-spinner", type: "spinner", startTime: now,
          duration: 0, frameRate: 120,
          lineStart: Math.max(0, lc - 2), lineCount: 1,
          config: {},
        });
        break;

      // ── EVENT ANNOUNCEMENT: stamp flash on event art ──
      case "event_announcement":
        animManager.add({
          id: "event-stamp", type: "stamp", startTime: now,
          duration: 1500, frameRate: 60,
          lineStart: 0, lineCount: Math.min(10, lc),
          config: {},
        });
        break;

      // ── RESOLVING: spinner (loading) ──
      case "resolving":
        animManager.add({
          id: "resolve-spinner", type: "spinner", startTime: now,
          duration: 0, frameRate: 120,
          lineStart: Math.max(0, lc - 2), lineCount: 1,
          config: {},
        });
        break;

      // ── GAME WON: sparkle fireworks + rainbow (celebration) ──
      case "game_won":
        animManager.add({
          id: "win-fireworks", type: "sparkle", startTime: now,
          duration: 8000, frameRate: 80,
          lineStart: Math.max(0, lc - 20), lineCount: 18,
          config: { intensity: 0.15 },
        });
        animManager.add({
          id: "win-rainbow", type: "rainbow", startTime: now,
          duration: 8000, frameRate: 80,
          lineStart: Math.max(0, lc - 6), lineCount: 4,
          config: {},
        });
        break;

      // ── GAME LOST: red pulse (somber) ──
      case "game_lost":
        animManager.add({
          id: "lose-pulse", type: "pulse", startTime: now,
          duration: 5000, frameRate: 600,
          lineStart: Math.max(0, lc - 15), lineCount: 3,
          config: { palette: ["#e25555", "#706858"] },
        });
        break;

      // All other screens: no animation
      default:
        break;
    }
  }, [term.screen, term.lines.length, term.agentPage, animManager, gameState.agents]);

  // Auto-focus on mount
  useEffect(() => {
    shellRef.current?.focus();
  }, []);

  return (
    <div
      ref={shellRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        position: "fixed",
        inset: 0,
        background: TERMINAL_BG,
        fontFamily: TERMINAL_FONT,
        fontSize: "14px",
        lineHeight: "1.5",
        display: "flex",
        flexDirection: "column",
        outline: "none",
        overflow: "hidden",
        // CRT vignette effect
        boxShadow: `inset 0 0 120px rgba(0,0,0,0.4)`,
      }}
    >
      <StatusBar screen={term.screen} />

      {/* Main content area — panel layout or scrolling lines */}
      {PANEL_SCREENS.has(term.screen) ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ScreenLayout term={term} />
        </div>
      ) : (
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          }}
        >
          {term.lines.slice(0, revealedLines).map((line, i) => (
            <TerminalLineView
              key={i}
              line={line}
              lineIndex={i}
              animManager={animManager}
            />
          ))}
          {isTyping && (
            <div style={{ color: TERMINAL_COLORS.dim, fontSize: "0.75em", marginTop: "8px", fontStyle: "italic" }}>
              press any key to skip...
            </div>
          )}
        </div>
      )}

      {/* Input area — choices hidden while typing */}
      <TerminalInput
        choices={isTyping ? [] : term.choices}
        textInput={term.textInput}
        textPrompt={term.textPrompt}
        onChoice={(action, data) => processAction(action, data)}
        onTextSubmit={(val) => processAction("TEXT_SUBMIT", val)}
      />
    </div>
  );
}
