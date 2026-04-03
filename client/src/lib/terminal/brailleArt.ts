// ═══════════════════════════════════════════════════════════════
// BRAILLE ART RENDERER
//
// Uses Unicode braille characters (U+2800-U+28FF) to render
// pixel art in the terminal. Each character is a 2x4 pixel grid,
// giving 2x the horizontal and 4x the vertical resolution of
// regular characters.
//
// A 40-character wide display = 80 pixel columns
// A 6-line display = 24 pixel rows
// ═══════════════════════════════════════════════════════════════

import { line, span, blank, type TerminalLine, type TerminalColor } from "./terminalTypes";

/**
 * Convert an 8-element boolean array to a braille character.
 * Dot positions in the 2x4 grid:
 *   [0] [3]
 *   [1] [4]
 *   [2] [5]
 *   [6] [7]
 */
function toBraille(dots: boolean[]): string {
  let code = 0x2800;
  if (dots[0]) code |= 0x01;
  if (dots[1]) code |= 0x02;
  if (dots[2]) code |= 0x04;
  if (dots[3]) code |= 0x08;
  if (dots[4]) code |= 0x10;
  if (dots[5]) code |= 0x20;
  if (dots[6]) code |= 0x40;
  if (dots[7]) code |= 0x80;
  return String.fromCharCode(code);
}

/**
 * Render a pixel grid as braille terminal lines.
 */
function pixelsToLines(
  pixels: boolean[][],
  color: TerminalColor = "gold",
  indent: number = 4,
): TerminalLine[] {
  const height = pixels.length;
  const width = pixels[0]?.length ?? 0;
  const lines: TerminalLine[] = [];
  const pad = " ".repeat(indent);

  for (let row = 0; row < height; row += 4) {
    let str = pad;
    for (let col = 0; col < width; col += 2) {
      const dots = [
        pixels[row]?.[col] ?? false,
        pixels[row + 1]?.[col] ?? false,
        pixels[row + 2]?.[col] ?? false,
        pixels[row]?.[col + 1] ?? false,
        pixels[row + 1]?.[col + 1] ?? false,
        pixels[row + 2]?.[col + 1] ?? false,
        pixels[row + 3]?.[col] ?? false,
        pixels[row + 3]?.[col + 1] ?? false,
      ];
      str += toBraille(dots);
    }
    lines.push(line(span(str, color)));
  }

  return lines;
}

// ── Drawing primitives ──────────────────────────────────────

function createCanvas(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array(width).fill(false));
}

function drawCircle(pixels: boolean[][], cx: number, cy: number, r: number): void {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.03) {
    const x = Math.round(cx + Math.cos(angle) * r);
    const y = Math.round(cy + Math.sin(angle) * r * 0.6); // aspect ratio correction
    if (x >= 0 && x < pixels[0].length && y >= 0 && y < pixels.length) {
      pixels[y][x] = true;
    }
  }
}

function drawArc(pixels: boolean[][], cx: number, cy: number, r: number, startAngle: number, endAngle: number): void {
  for (let angle = startAngle; angle < endAngle; angle += 0.03) {
    const x = Math.round(cx + Math.cos(angle) * r);
    const y = Math.round(cy + Math.sin(angle) * r * 0.6);
    if (x >= 0 && x < pixels[0].length && y >= 0 && y < pixels.length) {
      pixels[y][x] = true;
    }
  }
}

function drawLine(pixels: boolean[][], x1: number, y1: number, x2: number, y2: number): void {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const steps = Math.max(dx, dy);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x1 + (x2 - x1) * i / steps);
    const y = Math.round(y1 + (y2 - y1) * i / steps);
    if (x >= 0 && x < pixels[0].length && y >= 0 && y < pixels.length) {
      pixels[y][x] = true;
    }
  }
}

function drawRect(pixels: boolean[][], x: number, y: number, w: number, h: number): void {
  drawLine(pixels, x, y, x + w, y);
  drawLine(pixels, x + w, y, x + w, y + h);
  drawLine(pixels, x + w, y + h, x, y + h);
  drawLine(pixels, x, y + h, x, y);
}

function drawStar(pixels: boolean[][], cx: number, cy: number, size: number): void {
  const points = 5;
  for (let i = 0; i < points; i++) {
    const outerAngle = (i * 2 * Math.PI / points) - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / points;
    const ox = Math.round(cx + Math.cos(outerAngle) * size);
    const oy = Math.round(cy + Math.sin(outerAngle) * size * 0.6);
    const ix = Math.round(cx + Math.cos(innerAngle) * size * 0.4);
    const iy = Math.round(cy + Math.sin(innerAngle) * size * 0.4 * 0.6);
    drawLine(pixels, ox, oy, ix, iy);
    const nextOuter = ((i + 1) % points) * 2 * Math.PI / points - Math.PI / 2;
    const nox = Math.round(cx + Math.cos(nextOuter) * size);
    const noy = Math.round(cy + Math.sin(nextOuter) * size * 0.6);
    drawLine(pixels, ix, iy, nox, noy);
  }
}

function drawDot(pixels: boolean[][], x: number, y: number): void {
  if (x >= 0 && x < pixels[0].length && y >= 0 && y < pixels.length) {
    pixels[y][x] = true;
  }
}

// ── Scene/mood art ──────────────────────────────────────────

/** Treasure chest (for found items, mystery events) */
export function renderChest(): TerminalLine[] {
  const w = 40, h = 20;
  const px = createCanvas(w, h);

  // Chest body
  drawRect(px, 8, 8, 24, 10);
  // Lid (arched top)
  drawArc(px, 20, 8, 12, Math.PI, Math.PI * 2);
  // Keyhole
  drawCircle(px, 20, 13, 2);
  drawLine(px, 20, 15, 20, 16);
  // Lock plate
  drawRect(px, 17, 11, 6, 6);
  // Sparkles
  const sparkles = [[5, 2], [35, 3], [3, 8], [37, 6], [20, 1]];
  sparkles.forEach(([x, y]) => drawDot(px, x, y));

  return pixelsToLines(px, "amber", 10);
}

/** Marketplace/trading scene */
export function renderMarketplace(): TerminalLine[] {
  const w = 70, h = 24;
  const px = createCanvas(w, h);

  // Awning 1
  drawLine(px, 5, 6, 25, 6);
  drawLine(px, 3, 4, 5, 6);
  drawLine(px, 27, 4, 25, 6);
  // Stall 1
  drawRect(px, 5, 6, 20, 14);
  // Goods on shelf
  drawLine(px, 8, 12, 22, 12);
  drawCircle(px, 12, 10, 2);
  drawCircle(px, 18, 10, 2);

  // Awning 2
  drawLine(px, 35, 6, 55, 6);
  drawLine(px, 33, 4, 35, 6);
  drawLine(px, 57, 4, 55, 6);
  // Stall 2
  drawRect(px, 35, 6, 20, 14);
  // Goods
  drawRect(px, 40, 9, 4, 4);
  drawRect(px, 47, 9, 4, 4);

  // Ground
  drawLine(px, 0, 22, 70, 22);

  // People (simple figures)
  drawLine(px, 30, 14, 30, 20);
  drawCircle(px, 30, 12, 2);
  drawLine(px, 28, 16, 32, 16); // arms

  // Lanterns hanging
  drawLine(px, 15, 0, 15, 4);
  drawCircle(px, 15, 5, 1);
  drawLine(px, 45, 0, 45, 4);
  drawCircle(px, 45, 5, 1);

  // Stars
  drawDot(px, 8, 1);
  drawDot(px, 55, 0);
  drawDot(px, 35, 1);

  return pixelsToLines(px, "amber", 2);
}

/** Ship/caravan (for logistics missions) */
export function renderCaravan(): TerminalLine[] {
  const w = 50, h = 16;
  const px = createCanvas(w, h);

  // Camel 1
  drawArc(px, 12, 6, 4, Math.PI, Math.PI * 2); // hump
  drawLine(px, 8, 6, 8, 14); // front legs
  drawLine(px, 16, 6, 16, 14); // back legs
  drawLine(px, 6, 4, 8, 6); // neck
  drawCircle(px, 5, 3, 2); // head

  // Cargo on camel
  drawRect(px, 9, 3, 6, 3);

  // Camel 2
  drawArc(px, 30, 6, 4, Math.PI, Math.PI * 2);
  drawLine(px, 26, 6, 26, 14);
  drawLine(px, 34, 6, 34, 14);
  drawLine(px, 24, 4, 26, 6);
  drawCircle(px, 23, 3, 2);
  drawRect(px, 27, 3, 6, 3);

  // Ground
  drawLine(px, 0, 14, 50, 14);

  // Dust clouds
  drawDot(px, 40, 12);
  drawDot(px, 42, 13);
  drawDot(px, 44, 11);

  return pixelsToLines(px, "gold", 6);
}

/** Spy/intel scene (for investigation missions) */
export function renderSpyScene(): TerminalLine[] {
  const w = 50, h = 20;
  const px = createCanvas(w, h);

  // Shadowy alley walls
  drawLine(px, 5, 0, 5, 20);
  drawLine(px, 45, 0, 45, 20);

  // Cloaked figure
  drawCircle(px, 25, 4, 3); // head/hood
  drawLine(px, 22, 7, 20, 18); // left cloak
  drawLine(px, 28, 7, 30, 18); // right cloak
  drawLine(px, 20, 18, 30, 18); // cloak bottom

  // Scroll in hand
  drawRect(px, 14, 10, 6, 3);

  // Lantern glow
  drawCircle(px, 40, 8, 3);
  drawDot(px, 40, 8);

  // Shadows
  drawLine(px, 10, 19, 3, 19);
  drawLine(px, 35, 19, 47, 19);

  return pixelsToLines(px, "purple", 6);
}

/** Celebration/festival scene */
export function renderFestival(): TerminalLine[] {
  const w = 60, h = 20;
  const px = createCanvas(w, h);

  // Banner string
  drawLine(px, 5, 3, 55, 3);

  // Triangular banners
  for (let i = 0; i < 8; i++) {
    const x = 8 + i * 6;
    drawLine(px, x, 3, x + 3, 8);
    drawLine(px, x + 6, 3, x + 3, 8);
    drawLine(px, x, 3, x + 6, 3);
  }

  // Stage/platform
  drawRect(px, 15, 12, 30, 6);
  drawLine(px, 15, 14, 45, 14);

  // Performer
  drawCircle(px, 30, 10, 2);
  drawLine(px, 30, 12, 30, 16);
  drawLine(px, 28, 13, 32, 13);

  // Audience (dots)
  for (let i = 0; i < 6; i++) {
    drawDot(px, 10 + i * 3, 18);
    drawDot(px, 38 + i * 3, 18);
  }

  // Firework sparks
  drawStar(px, 10, 2, 3);
  drawStar(px, 50, 1, 3);

  return pixelsToLines(px, "orange", 4);
}

/** Crashed/ruined scene (for market crash) */
export function renderCrash(): TerminalLine[] {
  const w = 50, h = 20;
  const px = createCanvas(w, h);

  // Tilted/broken stall
  drawLine(px, 10, 4, 30, 8); // tilted roof
  drawLine(px, 30, 8, 40, 6);
  drawLine(px, 10, 4, 10, 16);
  drawLine(px, 40, 6, 40, 16);

  // Broken counter
  drawLine(px, 12, 12, 25, 14);
  drawLine(px, 28, 12, 38, 12);

  // Scattered coins
  drawCircle(px, 20, 17, 1);
  drawCircle(px, 25, 18, 1);
  drawCircle(px, 30, 16, 1);
  drawDot(px, 15, 18);
  drawDot(px, 35, 17);

  // Cracks
  drawLine(px, 22, 0, 20, 4);
  drawLine(px, 20, 4, 24, 8);

  // Ground
  drawLine(px, 3, 19, 47, 19);

  return pixelsToLines(px, "red", 6);
}

/** Handshake (for successful partnerships) */
export function renderHandshake(): TerminalLine[] {
  const w = 40, h = 16;
  const px = createCanvas(w, h);

  // Left arm
  drawLine(px, 5, 8, 15, 8);
  drawLine(px, 5, 6, 5, 10);

  // Right arm
  drawLine(px, 25, 8, 35, 8);
  drawLine(px, 35, 6, 35, 10);

  // Clasped hands
  drawCircle(px, 20, 8, 4);
  drawLine(px, 17, 6, 23, 10);
  drawLine(px, 17, 10, 23, 6);

  // Sparkles
  drawDot(px, 20, 2);
  drawDot(px, 15, 3);
  drawDot(px, 25, 3);

  return pixelsToLines(px, "green", 10);
}

// ── Pre-built art pieces ────────────────────────────────────

/**
 * Grand bazaar entrance with domed archway, minarets, and marketplace.
 * ~55 chars wide, ~12 lines tall in braille
 */
export function renderBazaarEntrance(): TerminalLine[] {
  const w = 110, h = 48;
  const px = createCanvas(w, h);

  // Sky stars
  const stars = [[8, 2], [20, 1], [35, 3], [50, 1], [70, 2], [5, 4], [95, 3],
    [85, 1], [15, 5], [65, 4], [100, 2], [45, 2], [78, 5], [30, 0], [90, 0]];
  stars.forEach(([x, y]) => drawDot(px, x, y));

  // Crescent moon
  drawArc(px, 55, 4, 5, Math.PI * 0.2, Math.PI * 1.8);
  drawArc(px, 57, 4, 4, Math.PI * 0.2, Math.PI * 1.5);

  // Central large dome
  drawArc(px, 55, 20, 22, Math.PI, Math.PI * 2);
  drawLine(px, 33, 20, 77, 20); // dome base

  // Smaller side domes
  drawArc(px, 30, 18, 10, Math.PI, Math.PI * 2);
  drawArc(px, 80, 18, 10, Math.PI, Math.PI * 2);

  // Left minaret
  drawRect(px, 10, 10, 8, 36);
  drawArc(px, 14, 10, 4, Math.PI, Math.PI * 2);
  drawDot(px, 14, 5); // finial
  // Minaret details
  drawLine(px, 10, 20, 18, 20);
  drawLine(px, 10, 30, 18, 30);

  // Right minaret
  drawRect(px, 92, 10, 8, 36);
  drawArc(px, 96, 10, 4, Math.PI, Math.PI * 2);
  drawDot(px, 96, 5); // finial
  drawLine(px, 92, 20, 100, 20);
  drawLine(px, 92, 30, 100, 30);

  // Main walls
  drawLine(px, 20, 18, 20, 46);
  drawLine(px, 90, 18, 90, 46);

  // Grand doorway arch
  drawArc(px, 55, 32, 10, Math.PI, Math.PI * 2);
  drawLine(px, 45, 32, 45, 46);
  drawLine(px, 65, 32, 65, 46);

  // Window arches (left)
  drawArc(px, 30, 26, 4, Math.PI, Math.PI * 2);
  drawLine(px, 26, 26, 26, 32);
  drawLine(px, 34, 26, 34, 32);

  // Window arches (right)
  drawArc(px, 80, 26, 4, Math.PI, Math.PI * 2);
  drawLine(px, 76, 26, 76, 32);
  drawLine(px, 84, 26, 84, 32);

  // Decorative band
  drawLine(px, 20, 38, 90, 38);
  for (let x = 22; x < 90; x += 6) {
    drawDot(px, x, 37);
    drawDot(px, x + 3, 39);
  }

  // Ground/street
  drawLine(px, 0, 46, 110, 46);

  // Market stalls in foreground
  drawLine(px, 2, 40, 16, 40);
  drawLine(px, 2, 40, 2, 46);
  drawLine(px, 16, 40, 16, 46);
  drawCircle(px, 6, 43, 2); // goods
  drawCircle(px, 12, 43, 2);

  drawLine(px, 94, 40, 108, 40);
  drawLine(px, 94, 40, 94, 46);
  drawLine(px, 108, 40, 108, 46);
  drawCircle(px, 98, 43, 2);
  drawCircle(px, 104, 43, 2);

  // Hanging lanterns
  drawLine(px, 38, 15, 38, 18);
  drawCircle(px, 38, 19, 1);
  drawLine(px, 72, 15, 72, 18);
  drawCircle(px, 72, 19, 1);

  return pixelsToLines(px, "gold", 2);
}

/**
 * A trophy/chalice for the championship win.
 */
export function renderTrophy(): TerminalLine[] {
  const w = 60, h = 32;
  const px = createCanvas(w, h);

  // Cup body
  drawArc(px, 30, 8, 12, 0, Math.PI);
  drawLine(px, 18, 8, 18, 4);
  drawLine(px, 42, 8, 42, 4);
  drawArc(px, 30, 4, 12, Math.PI, Math.PI * 2);

  // Handles
  drawArc(px, 16, 8, 4, Math.PI * 0.5, Math.PI * 1.5);
  drawArc(px, 44, 8, 4, Math.PI * 1.5, Math.PI * 2.5);

  // Stem
  drawLine(px, 28, 20, 28, 26);
  drawLine(px, 32, 20, 32, 26);

  // Base
  drawLine(px, 22, 26, 38, 26);
  drawLine(px, 20, 28, 40, 28);
  drawLine(px, 20, 28, 22, 26);
  drawLine(px, 40, 28, 38, 26);

  // Star on cup
  drawStar(px, 30, 10, 5);

  // Sparkles
  const sparkles = [[10, 3], [50, 2], [8, 12], [52, 10], [15, 1], [45, 1]];
  sparkles.forEach(([x, y]) => drawDot(px, x, y));

  return pixelsToLines(px, "gold", 8);
}

/**
 * A large djinn figure emerging from smoke (Hakim).
 * ~40 chars wide, ~12 lines tall in braille
 */
export function renderDjinn(): TerminalLine[] {
  const w = 80, h = 48;
  const px = createCanvas(w, h);

  // Stars around
  const stars = [[5, 2], [75, 3], [8, 8], [72, 6], [3, 16], [77, 20],
    [10, 24], [70, 22], [5, 30], [75, 32]];
  stars.forEach(([x, y]) => drawDot(px, x, y));

  // Turban (large, ornate)
  drawArc(px, 40, 6, 10, Math.PI, Math.PI * 2);
  drawCircle(px, 40, 8, 8);
  // Jewel on turban
  drawStar(px, 40, 3, 3);

  // Face
  drawCircle(px, 40, 14, 7);
  // Eyes
  drawDot(px, 36, 13);
  drawDot(px, 37, 13);
  drawDot(px, 43, 13);
  drawDot(px, 44, 13);
  // Nose
  drawDot(px, 40, 15);
  // Beard
  drawLine(px, 35, 18, 40, 24);
  drawLine(px, 45, 18, 40, 24);
  drawLine(px, 37, 20, 40, 26);
  drawLine(px, 43, 20, 40, 26);

  // Shoulders and robes
  drawLine(px, 30, 20, 40, 18);
  drawLine(px, 50, 20, 40, 18);

  // Robe body (flowing)
  drawLine(px, 26, 22, 30, 20);
  drawLine(px, 54, 22, 50, 20);
  drawLine(px, 22, 32, 26, 22);
  drawLine(px, 58, 32, 54, 22);

  // Arms outstretched
  drawLine(px, 26, 22, 14, 28);
  drawLine(px, 54, 22, 66, 28);

  // Hands holding glowing orbs
  drawCircle(px, 12, 27, 3);
  drawDot(px, 12, 27);
  drawCircle(px, 68, 27, 3);
  drawDot(px, 68, 27);

  // Robe dissolving into smoke
  drawArc(px, 30, 36, 6, Math.PI * 0.3, Math.PI * 0.7);
  drawArc(px, 50, 36, 6, Math.PI * 0.3, Math.PI * 0.7);
  drawArc(px, 40, 38, 10, Math.PI * 0.2, Math.PI * 0.8);
  drawArc(px, 35, 40, 5, Math.PI * 0.3, Math.PI * 0.7);
  drawArc(px, 45, 40, 5, Math.PI * 0.3, Math.PI * 0.7);
  drawArc(px, 40, 42, 8, Math.PI * 0.3, Math.PI * 0.7);
  drawArc(px, 40, 44, 12, Math.PI * 0.3, Math.PI * 0.7);

  // Robe patterns
  drawLine(px, 32, 24, 32, 34);
  drawLine(px, 48, 24, 48, 34);
  drawDot(px, 36, 28);
  drawDot(px, 44, 28);
  drawDot(px, 40, 30);

  return pixelsToLines(px, "amber", 4);
}

/**
 * An open book/ledger.
 */
export function renderLedger(): TerminalLine[] {
  const w = 70, h = 24;
  const px = createCanvas(w, h);

  // Left page
  drawRect(px, 5, 2, 28, 18);
  // Right page
  drawRect(px, 37, 2, 28, 18);

  // Spine
  drawLine(px, 34, 0, 34, 22);
  drawLine(px, 36, 0, 36, 22);

  // Text lines on left page
  for (let i = 0; i < 6; i++) {
    drawLine(px, 8, 5 + i * 2, 30, 5 + i * 2);
  }

  // Text lines on right page
  for (let i = 0; i < 6; i++) {
    drawLine(px, 40, 5 + i * 2, 62, 5 + i * 2);
  }

  // Decorative corners
  drawArc(px, 9, 5, 3, Math.PI, Math.PI * 1.5);
  drawArc(px, 60, 5, 3, Math.PI * 1.5, Math.PI * 2);

  // Stars above
  const stars = [[15, 0], [55, 0], [35, 0], [10, 1], [60, 1]];
  stars.forEach(([x, y]) => drawDot(px, x, y));

  return pixelsToLines(px, "gold", 4);
}
