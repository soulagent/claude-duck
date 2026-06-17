#!/usr/bin/env node
// claude-duck — a swimming ASCII duck for your Claude Code status line. 🦆
//
// Cross-platform (Node, no deps). Reads the session JSON on stdin and prints a
// multi-line status line:
//   L1   : model · session/weekly usage bars (Pro/Max) · context bar · cost · git branch
//   L2–L4: a 3-row "pond" where a duck snakes DOWN the rows then back UP
//          (boustrophedon), flipping to face its travel direction, with a fading wake.
//
// Why a "·" waterline instead of plain spaces?
//   Claude Code TRIMS leading/empty whitespace on each status-line line. A duck
//   positioned with leading spaces snaps to the left edge every frame — it flips
//   direction but never moves. Filling the track with a non-space character makes
//   the position survive. (This was the whole bug. Don't "simplify" it back to spaces.)
//
// The duck only animates when Claude Code re-runs this script. Set
//   "statusLine": { "type": "command", "command": "node \"…/duck.mjs\"", "refreshInterval": 1 }
// so it re-runs every second (refreshInterval is SECONDS; min 1) — see the README.

import { execSync } from 'node:child_process';

const ESC = '\x1b';
const reset = `${ESC}[0m`;
const dim = `${ESC}[90m`;

// ---- read the session JSON from stdin ----
async function readStdin() {
  const chunks = [];
  try {
    for await (const c of process.stdin) chunks.push(c);
  } catch {
    /* no stdin */
  }
  return Buffer.concat(chunks).toString('utf8');
}
let d = {};
try {
  d = JSON.parse(await readStdin());
} catch {
  /* null/absent before the first API call — fall through to a default label */
}

// ---- colour helpers (24-bit truecolor; HSL lets us sweep a rainbow by hue) ----
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const fg = ([r, g, b]) => `${ESC}[38;2;${r};${g};${b}m`;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

// number tinted by usage hue (cool when low → hot when high), matching the bars
const hueNum = (p, suffix) => `${fg(hslToRgb(210 - (p / 100) * 210, 0.9, 0.62))}${p}${suffix}${reset}`;

// rainbow bar: each cell hued blue→red across its length; filled bright, empty dim
function rainbowBar(p) {
  const width = 14;
  const fill = Math.max(0, Math.min(width, Math.round((p / 100) * width)));
  let out = '';
  for (let i = 0; i < width; i++) {
    const h = 210 - (i / (width - 1)) * 210;
    out += i < fill ? `${fg(hslToRgb(h, 0.9, 0.55))}█${reset}` : `${fg([60, 70, 85])}─${reset}`;
  }
  return out;
}

// ---- Line 1: model · usage bars · context · cost · git branch ----
const parts = [];

const model = d?.model?.display_name;
if (model) parts.push(`${ESC}[36m${model}${reset}`);

const rl = d?.rate_limits;
if (rl?.five_hour?.used_percentage != null) {
  const p = Math.round(rl.five_hour.used_percentage);
  parts.push(`Session ${rainbowBar(p)} ${hueNum(p, '%')}`);
}
if (rl?.seven_day?.used_percentage != null) {
  const p = Math.round(rl.seven_day.used_percentage);
  parts.push(`Weekly ${rainbowBar(p)} ${hueNum(p, '%')}`);
}

const ctx = d?.context_window?.used_percentage;
if (ctx != null) {
  const p = Math.max(0, Math.min(100, Math.round(ctx)));
  parts.push(`ctx ${rainbowBar(p)} ${hueNum(p, '%')}`);
}

const cost = d?.cost?.total_cost_usd;
if (cost != null) parts.push(`$${Number(cost).toFixed(2)}`);

// git branch — teal on a feature branch, red on main/master (a gentle commit guardrail)
const dir = d?.workspace?.current_dir || d?.workspace?.project_dir;
if (dir) {
  try {
    const branch = execSync(`git -C "${dir}" branch --show-current`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (branch) {
      const arrow = '⎇';
      parts.push(
        branch === 'main' || branch === 'master'
          ? `${fg([240, 120, 90])}${arrow} ${branch}${reset}`
          : `${fg([120, 200, 180])}${arrow} ${branch}${reset}`,
      );
    }
  } catch {
    /* not a git repo */
  }
}

const line1 = parts.length ? parts.join(` ${dim}|${reset} `) : `${dim}🦆 claude-duck${reset}`;

// ---- Lines 2–4: a 3-row pond; the duck snakes down then back up, facing travel ----
const plain1 = stripAnsi(line1);
const track = Math.max(20, plain1.length); // pond width = the visible width of line 1
const nrows = 3; // rows of water to swim through
const dlen = 4; // duck glyph width  (\_o>  /  <o_/)
const range = Math.max(1, track - dlen); // horizontal span within a row
const step = Math.floor(Date.now() / 1000); // unix seconds → clock-driven motion
const speed = Math.max(1, Math.round(range / 24)); // ~24s per row-crossing (gentle cruise)

// serpentine: row0 L→R, row1 R→L, row2 L→R (one pass), then ping-pong back up
const pass = nrows * range;
const period = 2 * pass;
const phase = (step * speed) % period;
let t, fwd;
if (phase <= pass) {
  t = phase;
  fwd = true;
} else {
  t = period - phase;
  fwd = false;
}
let duckRow, pos, segRight;
if (t < range) {
  duckRow = 0;
  pos = Math.floor(t);
  segRight = true;
} else if (t < 2 * range) {
  duckRow = 1;
  pos = Math.floor(2 * range - t);
  segRight = false;
} else {
  duckRow = 2;
  pos = Math.floor(t - 2 * range);
  segRight = true;
}
pos = Math.max(0, Math.min(range, pos));
const goRight = fwd ? segRight : !segRight; // facing inverts on the way back up

const gold = fg([245, 205, 80]); // beak
const white = fg([240, 240, 240]); // body
// white body, yellow beak — the beak is the leading glyph in the travel direction
const duckStr = goRight ? `${white}\\_o${gold}>${reset}` : `${gold}<${white}o_/${reset}`;

// a fading squiggly wake trailing behind the duck (within its row)
const wakeCols = [
  [120, 165, 210],
  [85, 120, 165],
  [58, 82, 118],
];
const wake = {};
for (let w = 0; w < wakeCols.length; w++) {
  const rp = goRight ? pos - 1 - w : pos + dlen + w;
  if (rp >= 0 && rp < track) wake[rp] = wakeCols[w];
}

// fill every cell with a faint waterline char (NOT spaces — see the header note)
const waterFg = fg([42, 48, 58]); // near-invisible dark waterline
const waterCh = '·'; // '·'
const pondRows = [];
for (let r = 0; r < nrows; r++) {
  let s = waterFg;
  for (let i = 0; i < track; i++) {
    if (r === duckRow && i === pos) {
      s += duckStr + waterFg;
      i += dlen - 1;
    } else if (r === duckRow && wake[i] != null) {
      s += fg(wake[i]) + '~' + waterFg;
    } else {
      s += waterCh;
    }
  }
  s += reset;
  pondRows.push(s);
}

process.stdout.write([line1, ...pondRows].join('\n'));
