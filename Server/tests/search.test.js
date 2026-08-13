import assert from "node:assert/strict";
import test from "node:test";

import {
  getSafeSearchPattern,
  MAX_SEARCH_TERM_LENGTH,
} from "../utils/search.js";

test("search terms are trimmed and retain ordinary case-insensitive substring behavior", () => {
  const pattern = getSafeSearchPattern("  Project Alpha  ");
  const searchRegex = new RegExp(pattern, "i");

  assert.equal(pattern, "Project Alpha");
  assert.equal(searchRegex.test("Current PROJECT ALPHA delivery"), true);
  assert.equal(searchRegex.test("Project Beta"), false);
});

test("regex metacharacters are treated as literal search text", () => {
  const term = "report.*[final] (v2)+?^$|\\";
  const pattern = getSafeSearchPattern(term);
  const searchRegex = new RegExp(pattern, "i");

  assert.equal(pattern, "report\\.\\*\\[final\\] \\(v2\\)\\+\\?\\^\\$\\|\\\\");
  assert.equal(searchRegex.test(`prefix ${term} suffix`), true);
  assert.equal(searchRegex.test("report anything final v2"), false);
});

test("regex-shaped input cannot retain its operators", () => {
  const pattern = getSafeSearchPattern("(a+)+$");
  const searchRegex = new RegExp(pattern, "i");

  assert.equal(pattern, "\\(a\\+\\)\\+\\$");
  assert.equal(searchRegex.test("(a+)+$"), true);
  assert.equal(searchRegex.test("aaaaaaaaaaaaaaaa"), false);
});

test("search terms are capped before regex escaping", () => {
  const plainPattern = getSafeSearchPattern(`  ${"x".repeat(MAX_SEARCH_TERM_LENGTH + 25)}  `);
  const escapedPattern = getSafeSearchPattern(".".repeat(MAX_SEARCH_TERM_LENGTH + 25));

  assert.equal(plainPattern, "x".repeat(MAX_SEARCH_TERM_LENGTH));
  assert.equal(escapedPattern, "\\.".repeat(MAX_SEARCH_TERM_LENGTH));
});

test("empty and missing search terms produce no pattern", () => {
  assert.equal(getSafeSearchPattern(), "");
  assert.equal(getSafeSearchPattern(null), "");
  assert.equal(getSafeSearchPattern("   "), "");
});
