// Generates a snake that roams the contribution graph without eating the days with
// contributions: it walks only over empty days and, when a wall of contributions
// blocks the way, goes around it through a lane just outside the graph.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const PALETTES = {
  light: { empty: "#ebedf0", levels: ["#9be9a8", "#40c463", "#30a14e", "#216e39"], snake: "#8250df" },
  dark: { empty: "#161b22", levels: ["#0e4429", "#006d32", "#26a641", "#39d353"], snake: "#a371f7" },
};

const PITCH = 16;
const CELL = 12;
// Room for the lane around the graph, one cell wide.
const MARGIN = PITCH + 2;
const STEP_SECONDS = 0.1;
const SEGMENT_SIZES = [12, 10.5, 9, 7.5];

// Preference order among equally near cells: sweeping each column top to bottom
// and back makes the tour read as a snake instead of a random walk.
const DIRECTIONS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

const key = (x, y) => `${x},${y}`;

export function toGrid(calendar) {
  const cells = calendar.weeks.flatMap((week, x) =>
    week.contributionDays.map((day) => ({
      x,
      y: day.weekday,
      count: day.contributionCount,
      level: LEVELS[day.contributionLevel] ?? 0,
    })),
  );
  return {
    width: calendar.weeks.length,
    height: Math.max(...cells.map((c) => c.y)) + 1,
    cells,
  };
}

// Positions the snake may occupy: empty days, days not yet in the calendar and a
// one-cell lane around the graph. Days with contributions are never walkable.
function walkableArea(grid) {
  const cells = new Map(grid.cells.map((c) => [key(c.x, c.y), c]));
  const walkable = new Map();
  for (let x = -1; x <= grid.width; x++) {
    for (let y = -1; y <= grid.height; y++) {
      const cell = cells.get(key(x, y));
      if (!cell || cell.count === 0) walkable.set(key(x, y), { x, y, isDay: Boolean(cell) });
    }
  }
  return walkable;
}

function neighbors(walkable, { x, y }) {
  return DIRECTIONS.map(([dx, dy]) => walkable.get(key(x + dx, y + dy))).filter(Boolean);
}

// Shortest route from `from` (excluding it) to the nearest position that satisfies
// `isTarget`, or null when there is none. Ties keep the DIRECTIONS preference.
function routeTo(walkable, from, isTarget) {
  const previous = new Map([[key(from.x, from.y), null]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current !== from && isTarget(current)) {
      const route = [];
      for (let c = current; c !== from; c = previous.get(key(c.x, c.y))) route.unshift({ x: c.x, y: c.y });
      return route;
    }
    for (const next of neighbors(walkable, current)) {
      if (!previous.has(key(next.x, next.y))) {
        previous.set(key(next.x, next.y), current);
        queue.push(next);
      }
    }
  }
  return null;
}

function reachableFrom(walkable, origin) {
  const seen = new Set([key(origin.x, origin.y)]);
  const queue = [origin];
  for (let i = 0; i < queue.length; i++) {
    for (const next of neighbors(walkable, queue[i])) {
      if (!seen.has(key(next.x, next.y))) {
        seen.add(key(next.x, next.y));
        queue.push(next);
      }
    }
  }
  return seen;
}

export function planPath(grid) {
  const walkable = walkableArea(grid);
  // Empty days sealed in by contributions cannot be reached without crossing one,
  // so the tour only covers those connected to the outer lane.
  const reachable = reachableFrom(walkable, walkable.get(key(-1, -1)));
  const pending = [...walkable.values()].filter((p) => p.isDay && reachable.has(key(p.x, p.y)));
  if (pending.length === 0) return [];

  const first = pending.reduce((best, p) => (p.x < best.x || (p.x === best.x && p.y < best.y) ? p : best));
  const start = { x: first.x, y: first.y };
  const visited = new Set([key(start.x, start.y)]);
  const path = [start];

  for (;;) {
    const route = routeTo(walkable, path.at(-1), (p) => p.isDay && !visited.has(key(p.x, p.y)));
    if (!route) break;
    for (const step of route) visited.add(key(step.x, step.y));
    path.push(...route);
  }

  if (path.length > 1) {
    path.push(...routeTo(walkable, path.at(-1), (p) => p.x === start.x && p.y === start.y));
  }
  return path;
}

export function renderSvg(grid, path, theme) {
  const palette = PALETTES[theme];
  const width = (grid.width - 1) * PITCH + CELL + MARGIN * 2;
  const height = (grid.height - 1) * PITCH + CELL + MARGIN * 2;

  const drawCells = (cells) =>
    cells
      .map((c) => {
        const fill = c.level === 0 ? palette.empty : palette.levels[c.level - 1];
        return `<rect class="c" x="${c.x * PITCH}" y="${c.y * PITCH}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}"/>`;
      })
      .join("");
  const emptyCells = drawCells(grid.cells.filter((c) => c.count === 0));
  const busyCells = drawCells(grid.cells.filter((c) => c.count > 0));

  let style = "";
  let snake = "";
  if (path.length > 1) {
    const moves = path.length - 1;
    const duration = moves * STEP_SECONDS;
    const frames = path
      .map((p, i) => `${((i / moves) * 100).toFixed(4)}%{transform:translate(${p.x * PITCH}px,${p.y * PITCH}px)}`)
      .join("");
    style = `<style>.s{animation:m ${duration.toFixed(2)}s linear infinite}@keyframes m{${frames}}</style>`;
    // Each segment replays the head's route a few steps behind it. The path is a loop,
    // so starting it that far into the cycle keeps the body attached from the first frame.
    snake = SEGMENT_SIZES.map((size, i) => {
      const offset = (CELL - size) / 2;
      const delay = i === 0 ? 0 : -(duration - i * STEP_SECONDS);
      return `<rect class="s" x="${offset}" y="${offset}" width="${size}" height="${size}" rx="3" fill="${palette.snake}" style="animation-delay:${delay.toFixed(2)}s"/>`;
    })
      .reverse()
      .join("");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${-MARGIN} ${-MARGIN} ${width} ${height}">${style}${emptyCells}${snake}${busyCells}</svg>\n`;
}

async function fetchCalendar(user, token) {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{weekday contributionCount contributionLevel}}}}}}`;
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: user } }),
  });
  const body = await response.json();
  if (!response.ok || body.errors) {
    throw new Error(`GitHub GraphQL request failed: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data.user.contributionsCollection.contributionCalendar;
}

if (import.meta.main) {
  const outDir = process.argv[2] ?? "dist";
  // SNAKE_CALENDAR points to a saved calendar JSON, handy for previewing without a token.
  const calendar = process.env.SNAKE_CALENDAR
    ? JSON.parse(await readFile(process.env.SNAKE_CALENDAR, "utf8"))
    : await fetchCalendar(process.env.GITHUB_USER, process.env.GITHUB_TOKEN);

  const grid = toGrid(calendar);
  const path = planPath(grid);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "github-snake.svg"), renderSvg(grid, path, "light"));
  await writeFile(join(outDir, "github-snake-dark.svg"), renderSvg(grid, path, "dark"));
  console.log(`Snake path: ${path.length} steps over ${grid.cells.length} days.`);
}
