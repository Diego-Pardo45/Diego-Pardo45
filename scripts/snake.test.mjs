import { test } from "node:test";
import assert from "node:assert/strict";
import { toGrid, planPath, renderSvg } from "./snake.mjs";

// Builds a calendar like the GraphQL API returns it from an ASCII map:
// one string per weekday (row), "#" marks a day with contributions, "." an empty day.
function calendarFrom(rows) {
  const weekCount = rows[0].length;
  const weeks = [];
  for (let x = 0; x < weekCount; x++) {
    const contributionDays = [];
    for (let y = 0; y < rows.length; y++) {
      const busy = rows[y][x] === "#";
      contributionDays.push({
        weekday: y,
        contributionCount: busy ? 3 : 0,
        contributionLevel: busy ? "SECOND_QUARTILE" : "NONE",
      });
    }
    weeks.push({ contributionDays });
  }
  return { weeks };
}

const key = ({ x, y }) => `${x},${y}`;

const sample = calendarFrom([
  "..#....",
  ".##..#.",
  "....#..",
  "#......",
]);

test("toGrid maps each day to a cell with its weekday row and level", () => {
  const grid = toGrid(sample);
  assert.equal(grid.width, 7);
  assert.equal(grid.height, 4);
  const busy = grid.cells.find((c) => c.x === 2 && c.y === 0);
  assert.deepEqual(busy, { x: 2, y: 0, count: 3, level: 2 });
  const empty = grid.cells.find((c) => c.x === 0 && c.y === 0);
  assert.deepEqual(empty, { x: 0, y: 0, count: 0, level: 0 });
});

function assertNeverStepsOnContributions(grid, path) {
  const busy = new Set(grid.cells.filter((c) => c.count > 0).map(key));
  for (const step of path) {
    assert.ok(!busy.has(key(step)), `stepped on ${key(step)}`);
  }
}

test("the snake never steps on a day with contributions", () => {
  const grid = toGrid(sample);
  assertNeverStepsOnContributions(grid, planPath(grid));
});

test("a full column of contributions is walked around from the outside", () => {
  const grid = toGrid(calendarFrom([
    "..#..",
    "..#..",
    "..#..",
  ]));
  const path = planPath(grid);
  assertNeverStepsOnContributions(grid, path);
  assert.ok(path.some((s) => s.x === 0), "never reached the left side");
  assert.ok(path.some((s) => s.x === 4), "never reached the right side");
});

test("the snake stays within one cell of the graph", () => {
  const grid = toGrid(sample);
  for (const step of planPath(grid)) {
    assert.ok(step.x >= -1 && step.x <= grid.width, `left the graph at ${key(step)}`);
    assert.ok(step.y >= -1 && step.y <= grid.height, `left the graph at ${key(step)}`);
  }
});

test("the snake moves one cell at a time", () => {
  const path = planPath(toGrid(sample));
  for (let i = 1; i < path.length; i++) {
    const distance = Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y);
    assert.equal(distance, 1, `jump between step ${i - 1} and ${i}`);
  }
});

test("the snake visits every empty cell except those sealed in by contributions", () => {
  const grid = toGrid(calendarFrom([
    ".....",
    ".###.",
    ".#.#.",
    ".###.",
    ".....",
  ]));
  const path = planPath(grid);
  assertNeverStepsOnContributions(grid, path);
  const visited = new Set(path.map(key));
  for (const cell of grid.cells.filter((c) => c.count === 0)) {
    const sealed = cell.x === 2 && cell.y === 2;
    assert.equal(visited.has(key(cell)), !sealed, `${key(cell)} visited: ${visited.has(key(cell))}`);
  }
});

test("the path ends where it starts so the animation loops seamlessly", () => {
  const path = planPath(toGrid(sample));
  assert.deepEqual(path.at(-1), path[0]);
});

test("a calendar full of contributions produces no movement", () => {
  const grid = toGrid(calendarFrom(["###", "###"]));
  assert.deepEqual(planPath(grid), []);
});

test("days not yet in the calendar are not drawn", () => {
  const calendar = calendarFrom(["...", "..."]);
  calendar.weeks[2].contributionDays.pop();
  const grid = toGrid(calendar);
  assert.equal(grid.cells.length, 5);
  const svg = renderSvg(grid, planPath(grid), "light");
  assert.equal((svg.match(/class="c"/g) ?? []).length, 5);
});

test("renderSvg draws every day and animates the snake", () => {
  const grid = toGrid(sample);
  const svg = renderSvg(grid, planPath(grid), "light");
  assert.match(svg, /^<svg /);
  assert.equal((svg.match(/class="c"/g) ?? []).length, grid.cells.length);
  assert.match(svg, /@keyframes/);
  assert.match(svg, /class="s"/);
});

test("renderSvg draws days with contributions above the snake so it never hides them", () => {
  const grid = toGrid(sample);
  const svg = renderSvg(grid, planPath(grid), "light");
  const firstBusy = svg.indexOf('fill="#40c463"');
  assert.ok(firstBusy > svg.lastIndexOf('class="s"'));
});

test("renderSvg leaves the snake out when there is nowhere to move", () => {
  const grid = toGrid(calendarFrom(["##", "##"]));
  const svg = renderSvg(grid, planPath(grid), "dark");
  assert.doesNotMatch(svg, /class="s"/);
});
