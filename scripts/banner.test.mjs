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

test("the builder walks back to the start so the loop is seamless", () => {
  const { builder, total } = buildTimeline(["AB", "C"]);
  assert.equal(builder[0].slot, 0);
  assert.equal(builder.at(-1).slot, 0);
  assert.ok(builder.every((k) => k.time >= 0 && k.time <= total));
});

test("the builder hammers while placing letters and walks back while erasing", () => {
  const { letters, phases } = buildTimeline(["AB", "C"]);
  const [a, b] = letters;
  const [first] = phases;
  assert.ok(first.build[0] < a.appear && first.build[1] === b.appear, "hammering covers the placement of every letter");
  assert.ok(first.erase[0] >= b.appear && first.erase[1] === a.vanish, "walking back ends when the first letter is gone");
  assert.equal(phases.length, 2);
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
  assert.match(svg, /class="builder"/);
  assert.match(svg, /class="gear /);
});
