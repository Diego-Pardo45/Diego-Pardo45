import { test } from "node:test";
import assert from "node:assert/strict";
import { PHRASES, GLYPHS, buildTimeline, renderBanner } from "./banner.mjs";

test("every character in the phrases has a pixel glyph", () => {
  for (const phrase of PHRASES) {
    for (const ch of phrase) {
      assert.ok(GLYPHS[ch], `missing glyph for "${ch}"`);
      assert.equal(GLYPHS[ch].length, 7, `"${ch}" must be 7 rows tall`);
      for (const row of GLYPHS[ch]) assert.equal(row.length, 5, `"${ch}" must be 5 columns wide`);
    }
  }
});

test("letters of a phrase appear one after another and vanish after it is shown", () => {
  const { letters } = buildTimeline(["AB", "C"]);
  const [a, b, c] = letters;
  assert.ok(a.appear < b.appear, "B appears after A");
  assert.ok(b.appear < a.vanish, "A is still visible when B appears");
  assert.ok(b.vanish <= a.vanish, "B is erased before A");
  assert.ok(a.vanish <= c.appear, "the next phrase starts after the previous one is erased");
});

test("the cursor returns to the start so the loop is seamless", () => {
  const { cursor, total } = buildTimeline(["AB", "C"]);
  assert.equal(cursor[0].slot, 0);
  assert.equal(cursor.at(-1).slot, 0);
  assert.ok(cursor.every((k) => k.time >= 0 && k.time <= total));
});

test("spaces take typing time but draw nothing", () => {
  const { letters } = buildTimeline(["A B"]);
  assert.deepEqual(letters.map((l) => l.char), ["A", "B"]);
  assert.equal(letters[1].slot, 2);
});

test("renderBanner draws one animated group per visible letter", () => {
  const svg = renderBanner(["AB", "C D"]);
  assert.match(svg, /^<svg /);
  assert.equal((svg.match(/class="ch /g) ?? []).length, 4);
  assert.match(svg, /class="cursor"/);
});
