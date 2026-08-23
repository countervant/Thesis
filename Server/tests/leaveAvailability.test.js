import assert from "node:assert/strict";
import test from "node:test";

import { getManilaDayRange } from "../utils/leaveAvailability.js";

test("Manila day ranges start and end at midnight in Asia/Manila", () => {
  const { start, end } = getManilaDayRange(new Date("2026-08-23T15:59:59.999Z"));

  assert.equal(start.toISOString(), "2026-08-22T16:00:00.000Z");
  assert.equal(end.toISOString(), "2026-08-23T16:00:00.000Z");
});

test("Manila day ranges roll over at 16:00 UTC", () => {
  const { start, end } = getManilaDayRange(new Date("2026-08-23T16:00:00.000Z"));

  assert.equal(start.toISOString(), "2026-08-23T16:00:00.000Z");
  assert.equal(end.toISOString(), "2026-08-24T16:00:00.000Z");
});
