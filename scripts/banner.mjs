// Generates the header banner: the pixel character, wearing a white hard hat, walks
// along a steel beam hammering each letter of a phrase into place. It holds the
// phrase, walks back erasing it and builds the next one, with gears turning behind.
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
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
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
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
};

const TYPE_SECONDS = 0.14;
const HOLD_SECONDS = 2.2;
const ERASE_SECONDS = 0.04;
const PAUSE_SECONDS = 0.4;

const TEXT_X = 8;
const TEXT_Y = 12;
const ADVANCE = 6;
const HEIGHT = 24;
const SCALE = 2.5;
const TEXT_COLOR = "#2EA043";
// The builder stands one slot ahead of the letter it is hammering.
const BUILDER_X = TEXT_X + 7;
const BUILDER_Y = TEXT_Y - 6;

// Times in seconds for every visible letter, every builder move and the moments it
// is hammering (build) or walking back (erase), over one loop.
export function buildTimeline(phrases) {
  const letters = [];
  const builder = [{ time: 0, slot: 0 }];
  const phases = [];
  let start = 0;
  for (const phrase of phrases) {
    const chars = [...phrase];
    const typed = chars.map((char, slot) => ({ char, slot, appear: start + (slot + 1) * TYPE_SECONDS }));
    for (const { slot, appear } of typed) builder.push({ time: appear, slot: slot + 1 });

    const erasingFrom = start + chars.length * TYPE_SECONDS + HOLD_SECONDS;
    for (let k = 1; k <= chars.length; k++) {
      const letter = typed[chars.length - k];
      letter.vanish = erasingFrom + k * ERASE_SECONDS;
      builder.push({ time: letter.vanish, slot: letter.slot });
    }
    const erasedAt = erasingFrom + chars.length * ERASE_SECONDS;
    phases.push({ build: [start, typed.at(-1).appear], erase: [erasingFrom, erasedAt] });
    letters.push(...typed.filter((l) => l.char !== " "));
    start = erasedAt + PAUSE_SECONDS;
  }
  return { letters, builder, phases, total: start };
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

// Keyframes that show an element only inside the given [from, to] windows.
function windowFrames(name, windows, total) {
  const frames = [`0%{opacity:${windows[0][0] === 0 ? 1 : 0}}`];
  for (const [from, to] of windows) {
    if (from > 0) frames.push(`${pct(from, total)}{opacity:1}`);
    frames.push(`${pct(to, total)}{opacity:0}`);
  }
  return `@keyframes ${name}{${frames.join("")}}`;
}

function gear(cx, cy, r, teeth, spin) {
  const tooth = (i) =>
    `<rect x="${cx - 1}" y="${cy - r - 2}" width="2" height="3" transform="rotate(${(360 / teeth) * i} ${cx} ${cy})"/>`;
  return `<g class="gear ${spin}" fill="#8b949e"><circle cx="${cx}" cy="${cy}" r="${r - 0.75}" fill="none" stroke="#8b949e" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${Math.max(1, r / 3)}"/>${Array.from({ length: teeth }, (_, i) => tooth(i)).join("")}</g>`;
}

// Local coordinates: facing left, the letter being hammered spans x -7..-2, y 6..12.
const BUILDER = `
    <rect x="2" y="0" width="6" height="1" fill="#f5f5f5"/>
    <rect x="1" y="1" width="8" height="1" fill="#f5f5f5"/>
    <rect x="4" y="0" width="1" height="2" fill="#ffffff"/>
    <rect x="-1" y="2" width="11" height="1" fill="#c9d1d9"/>
    <rect x="0" y="3" width="10" height="5" fill="#D97757"/>
    <rect x="0" y="3" width="10" height="1" fill="#C15F3C"/>
    <rect class="blink" x="2" y="4" width="1" height="2" fill="#1a1a1a"/>
    <rect class="blink" x="5" y="4" width="1" height="2" fill="#1a1a1a"/>
    <rect x="0" y="8" width="10" height="3" fill="#16191d"/>
    <rect x="0" y="8" width="10" height="1" fill="#3a414b"/>
    <rect x="2" y="8" width="2" height="3" fill="#f0f0f0"/>
    <rect x="10" y="9" width="1" height="2" fill="#16191d"/>
    <g class="walking">
      <g class="leg-a"><rect x="1" y="11" width="1" height="2" fill="#C15F3C"/><rect x="6" y="11" width="1" height="2" fill="#C15F3C"/></g>
      <g class="leg-b"><rect x="3" y="11" width="1" height="2" fill="#C15F3C"/><rect x="8" y="11" width="1" height="2" fill="#C15F3C"/></g>
    </g>
    <g class="standing">
      <rect x="1" y="11" width="1" height="2" fill="#C15F3C"/><rect x="3" y="11" width="1" height="2" fill="#C15F3C"/>
      <rect x="6" y="11" width="1" height="2" fill="#C15F3C"/><rect x="8" y="11" width="1" height="2" fill="#C15F3C"/>
    </g>
    <rect x="-2" y="8" width="2" height="2" fill="#D97757"/>
    <g class="hammering">
      <g class="swing-up"><rect x="-2" y="3" width="1" height="5" fill="#8b5a2b"/><rect x="-4" y="1" width="4" height="2" fill="#8b949e"/></g>
      <g class="swing-down">
        <rect x="-3" y="7" width="3" height="1" fill="#8b5a2b"/><rect x="-6" y="5" width="3" height="3" fill="#8b949e"/>
        <rect x="-8" y="4" width="1" height="1" fill="#e3b341"/><rect x="-2" y="4" width="1" height="1" fill="#e3b341"/><rect x="-5" y="3" width="1" height="1" fill="#ffffff"/>
      </g>
    </g>
    <g class="resting"><rect x="-2" y="3" width="1" height="5" fill="#8b5a2b"/><rect x="-4" y="1" width="4" height="2" fill="#8b949e"/></g>`;

export function renderBanner(phrases) {
  const { letters, builder, phases, total } = buildTimeline(phrases);
  const longest = Math.max(...phrases.map((p) => [...p].length));
  const width = TEXT_X + longest * ADVANCE + 20;
  const duration = `${total.toFixed(2)}s`;
  const swing = `${TYPE_SECONDS}s`;

  const building = phases.map((p) => p.build);
  const moving = phases.flatMap((p) => [p.build, p.erase]);
  const idle = [];
  let from = 0;
  for (const [a, b] of moving) {
    if (a > from) idle.push([from, a]);
    from = b;
  }
  if (from < total) idle.push([from, total]);
  const notBuilding = [];
  from = 0;
  for (const [a, b] of building) {
    if (a > from) notBuilding.push([from, a]);
    from = b;
  }
  if (from < total) notBuilding.push([from, total]);

  const letterStyles = letters
    .map(
      (l, i) =>
        `.k${i}{animation-name:k${i}}@keyframes k${i}{0%{opacity:0}${pct(l.appear, total)}{opacity:1}${pct(l.vanish, total)}{opacity:0}}`,
    )
    .join("");
  const builderFrames = builder.map((k) => `${pct(k.time, total)}{transform:translateX(${k.slot * ADVANCE}px)}`).join("");

  const style = `<style>
    .ch{opacity:0;animation:${duration} steps(1) infinite}${letterStyles}
    .builder{animation:walk ${duration} steps(1) infinite}@keyframes walk{${builderFrames}}
    .hammering{animation:hammering ${duration} steps(1) infinite}${windowFrames("hammering", building, total)}
    .resting{animation:resting ${duration} steps(1) infinite}${windowFrames("resting", notBuilding, total)}
    .walking{animation:walking ${duration} steps(1) infinite}${windowFrames("walking", moving, total)}
    .standing{animation:standing ${duration} steps(1) infinite}${windowFrames("standing", idle, total)}
    .swing-up{animation:up ${swing} steps(1) infinite}@keyframes up{0%{opacity:1}50%{opacity:0}}
    .swing-down{animation:down ${swing} steps(1) infinite}@keyframes down{0%{opacity:0}50%{opacity:1}}
    .leg-a{animation:step ${TYPE_SECONDS * 2}s steps(1) infinite}.leg-b{animation:step ${TYPE_SECONDS * 2}s steps(1) infinite;animation-delay:-${TYPE_SECONDS}s}
    @keyframes step{0%{transform:translateY(0)}50%{transform:translateY(-1px)}}
    .blink{transform-box:fill-box;transform-origin:center;animation:blink 4.5s infinite}
    @keyframes blink{0%,90%,96%,100%{transform:scaleY(1)}93%{transform:scaleY(.2)}}
    .gear{opacity:.22;transform-box:fill-box;transform-origin:center;animation:spin 8s linear infinite}
    .gear.fast{animation-duration:5s}.gear.ccw{animation-direction:reverse}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>`;

  const gears = [
    gear(Math.round(width * 0.28), 9, 7, 10, ""),
    gear(Math.round(width * 0.28) + 11, 15, 4, 7, "fast ccw"),
    gear(Math.round(width * 0.66), 8, 6, 9, "ccw"),
    gear(Math.round(width * 0.9), 11, 5, 8, "fast"),
  ].join("\n  ");

  const beamY = TEXT_Y + 7;
  const rivets = Array.from(
    { length: Math.floor((width - TEXT_X) / ADVANCE) },
    (_, i) => `<rect x="${TEXT_X + 1 + i * ADVANCE}" y="${beamY}" width="1" height="1" fill="#8b949e"/>`,
  ).join("");
  const beam = `<rect x="${TEXT_X - 3}" y="${beamY}" width="${width - TEXT_X + 1}" height="2" fill="#6e7681"/><rect x="${TEXT_X - 3}" y="${beamY + 1}" width="${width - TEXT_X + 1}" height="1" fill="#484f58"/>${rivets}`;

  const text = letters
    .map((l, i) => `<g class="ch k${i}">${glyphRects(l.char, TEXT_X + l.slot * ADVANCE, TEXT_Y)}</g>`)
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * SCALE}" height="${HEIGHT * SCALE}" viewBox="0 0 ${width} ${HEIGHT}" shape-rendering="crispEdges">
  <title>${phrases.join(" / ")}</title>
  ${style}
  ${gears}
  ${beam}
  <g fill="${TEXT_COLOR}">
  ${text}
  </g>
  <g transform="translate(${BUILDER_X} ${BUILDER_Y})"><g class="builder">${BUILDER}
  </g></g>
</svg>
`;
}

if (import.meta.main) {
  const out = process.argv[2] ?? "assets/banner.svg";
  await writeFile(out, renderBanner(PHRASES));
  console.log(`Banner written to ${out}.`);
}
