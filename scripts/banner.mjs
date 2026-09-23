// Generates the header banner: the pixel character types on a laptop and a cursor
// builds each phrase letter by letter, holds it, erases it and moves on to the next.
// Edit PHRASES and run `node scripts/banner.mjs` to regenerate assets/banner.svg.
import { writeFile } from "node:fs/promises";

export const PHRASES = [
  "DESARROLLADOR FULL STACK",
  "APIS TIPADAS DE EXTREMO A EXTREMO",
  "TDD · CI/CD · GOOGLE CLOUD",
];

// 5x7 pixel font, one string per row.
export const GLYPHS = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
};

const TYPE_SECONDS = 0.07;
const HOLD_SECONDS = 2.4;
const ERASE_SECONDS = 0.025;
const PAUSE_SECONDS = 0.35;

const TEXT_X = 38;
const TEXT_Y = 13;
const ADVANCE = 6;
const HEIGHT = 32;
const SCALE = 2.5;
const TEXT_COLOR = "#2EA043";
const CURSOR_COLOR = "#7ee787";

// Times in seconds for every visible letter and every cursor move over one loop.
export function buildTimeline(phrases) {
  const letters = [];
  const cursor = [{ time: 0, slot: 0 }];
  let start = 0;
  for (const phrase of phrases) {
    const chars = [...phrase];
    const typed = chars.map((char, slot) => ({ char, slot, appear: start + (slot + 1) * TYPE_SECONDS }));
    for (const { slot, appear } of typed) cursor.push({ time: appear, slot: slot + 1 });

    const erasingFrom = start + chars.length * TYPE_SECONDS + HOLD_SECONDS;
    for (let k = 1; k <= chars.length; k++) {
      const letter = typed[chars.length - k];
      letter.vanish = erasingFrom + k * ERASE_SECONDS;
      cursor.push({ time: letter.vanish, slot: letter.slot });
    }
    letters.push(...typed.filter((l) => l.char !== " "));
    start = erasingFrom + chars.length * ERASE_SECONDS + PAUSE_SECONDS;
  }
  return { letters, cursor, total: start };
}

function glyphRects(char, x, y) {
  let rects = "";
  GLYPHS[char].forEach((row, r) => {
    for (let c = 0; c < row.length; ) {
      if (row[c] !== "1") {
        c++;
        continue;
      }
      const from = c;
      while (row[c] === "1") c++;
      rects += `<rect x="${x + from}" y="${y + r}" width="${c - from}" height="1"/>`;
    }
  });
  return rects;
}

const pct = (time, total) => `${((time / total) * 100).toFixed(3)}%`;

// The same small character as assets/coder.svg, typing on a laptop seen from the side.
const CHARACTER = `
  <rect x="2" y="25" width="32" height="1" fill="#8b5a2b"/>
  <rect x="2" y="26" width="32" height="1" fill="#6b4423"/>
  <rect x="4" y="12" width="14" height="7" fill="#D97757"/>
  <rect x="4" y="12" width="14" height="1" fill="#E8906F"/>
  <rect class="blink" x="12" y="14" width="1" height="2" fill="#1a1a1a"/>
  <rect class="blink" x="16" y="14" width="1" height="2" fill="#1a1a1a"/>
  <rect x="4" y="19" width="14" height="6" fill="#16191d"/>
  <rect x="4" y="19" width="14" height="1" fill="#3a414b"/>
  <rect x="12" y="19" width="3" height="6" fill="#f0f0f0"/>
  <rect x="11" y="20" width="1" height="5" fill="#2b3038"/>
  <rect x="15" y="20" width="1" height="5" fill="#2b3038"/>
  <rect x="2" y="20" width="2" height="2" fill="#16191d"/>
  <rect x="20" y="24" width="11" height="1" fill="#8b949e"/>
  <rect x="29" y="15" width="2" height="9" fill="#30363d"/>
  <rect x="28" y="16" width="1" height="7" fill="#79c0ff" opacity="0.6"/>
  <g class="tap-b"><rect x="18" y="20" width="3" height="2" fill="#0b0d10"/><rect x="21" y="21" width="2" height="2" fill="#C15F3C"/></g>
  <g class="tap-a"><rect x="18" y="21" width="3" height="2" fill="#16191d"/><rect x="18" y="21" width="3" height="1" fill="#3a414b"/><rect x="23" y="22" width="2" height="2" fill="#D97757"/></g>
  <line class="cable" x1="31" y1="16.5" x2="${TEXT_X - 1}" y2="16.5" stroke="${TEXT_COLOR}" stroke-width="1" stroke-dasharray="1 1"/>`;

export function renderBanner(phrases) {
  const { letters, cursor, total } = buildTimeline(phrases);
  const longest = Math.max(...phrases.map((p) => [...p].length));
  const width = TEXT_X + longest * ADVANCE + 2;
  const duration = `${total.toFixed(2)}s`;

  const letterStyles = letters
    .map(
      (l, i) =>
        `.k${i}{animation-name:k${i}}@keyframes k${i}{0%{opacity:0}${pct(l.appear, total)}{opacity:1}${pct(l.vanish, total)}{opacity:0}}`,
    )
    .join("");
  const cursorFrames = cursor.map((k) => `${pct(k.time, total)}{transform:translateX(${k.slot * ADVANCE}px)}`).join("");

  const style = `<style>
    .ch{opacity:0;animation:${duration} steps(1) infinite}${letterStyles}
    .cursor{animation:cur ${duration} steps(1) infinite}@keyframes cur{${cursorFrames}}
    .cursor rect{animation:caret .8s steps(1) infinite}@keyframes caret{50%{opacity:.35}}
    .blink{transform-box:fill-box;transform-origin:center;animation:blink 4.5s infinite}
    @keyframes blink{0%,90%,96%,100%{transform:scaleY(1)}93%{transform:scaleY(.2)}}
    .tap-a{animation:tap .3s steps(1) infinite}.tap-b{animation:tap .3s steps(1) infinite;animation-delay:-.15s}
    @keyframes tap{50%{transform:translateY(1px)}}
    .cable{animation:flow .4s linear infinite}@keyframes flow{to{stroke-dashoffset:-2}}
  </style>`;

  const text = letters
    .map((l, i) => `<g class="ch k${i}">${glyphRects(l.char, TEXT_X + l.slot * ADVANCE, TEXT_Y)}</g>`)
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * SCALE}" height="${HEIGHT * SCALE}" viewBox="0 0 ${width} ${HEIGHT}" shape-rendering="crispEdges">
  <title>${phrases.join(" / ")}</title>
  ${style}${CHARACTER}
  <g fill="${TEXT_COLOR}">
  ${text}
  </g>
  <g class="cursor"><rect x="${TEXT_X}" y="${TEXT_Y}" width="5" height="7" fill="${CURSOR_COLOR}"/></g>
</svg>
`;
}

if (import.meta.main) {
  const out = process.argv[2] ?? "assets/banner.svg";
  await writeFile(out, renderBanner(PHRASES));
  console.log(`Banner written to ${out}.`);
}
