import { TERMINAL_COLORS, TERMINAL_FONT } from "@/lib/terminal/terminalColors";
import type { TerminalColor } from "@/lib/terminal/terminalTypes";

// ═══════════════════════════════════════════════════════════════
// TERMINAL PANEL — Bordered box with title, used for TUI layouts
// ═══════════════════════════════════════════════════════════════

interface PanelProps {
  title?: string;
  titleColor?: TerminalColor;
  children: React.ReactNode;
  minHeight?: string;
  scroll?: boolean;
  borderColor?: string;
}

export function TerminalPanel({
  title,
  titleColor = "amber",
  children,
  minHeight,
  scroll = false,
  borderColor,
}: PanelProps) {
  const border = borderColor ?? `${TERMINAL_COLORS.dim}60`;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: "2px",
        minHeight,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {title && (
        <div
          style={{
            borderBottom: `1px solid ${border}`,
            padding: "4px 10px",
            fontSize: "0.75em",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: TERMINAL_COLORS[titleColor],
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          flex: 1,
          padding: "8px 10px",
          overflowY: scroll ? "auto" : "hidden",
          fontSize: "0.9em",
          lineHeight: "1.5",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT HELPERS
// ═══════════════════════════════════════════════════════════════

interface GridProps {
  columns: string; // CSS grid-template-columns
  gap?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function PanelGrid({ columns, gap = "8px", children, style }: GridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEXT HELPERS — for rendering inside panels
// ═══════════════════════════════════════════════════════════════

export function PanelText({
  color = "white",
  bold = false,
  dim = false,
  children,
}: {
  color?: TerminalColor;
  bold?: boolean;
  dim?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        color: dim ? TERMINAL_COLORS.dim : TERMINAL_COLORS[color],
        fontWeight: bold ? "bold" : undefined,
      }}
    >
      {children}
    </span>
  );
}

export function PanelLine({ children }: { children: React.ReactNode }) {
  return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</div>;
}

export function PanelSpacer() {
  return <div style={{ height: "0.7em" }} />;
}

export function StatBar({
  label,
  value,
  max = 100,
  color = "green",
  width = 10,
}: {
  label: string;
  value: number;
  max?: number;
  color?: TerminalColor;
  width?: number;
}) {
  const filled = Math.round((value / max) * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);

  return (
    <PanelLine>
      <PanelText dim>{label}: </PanelText>
      <PanelText color={color}>{bar}</PanelText>
      <PanelText dim> {value}/{max}</PanelText>
    </PanelLine>
  );
}
