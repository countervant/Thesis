import assert from "node:assert/strict";
import test from "node:test";

import { createRateLimiter } from "../middleware/rateLimit.js";

const createResponse = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  set(name, value) {
    this.headers[name] = value;
  },
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("rate limiting can charge bulk operations by request cost", () => {
  const limiter = createRateLimiter({
    max: 3,
    windowMs: 60_000,
    keyGenerator: (request) => request.user.id,
    requestCost: (request) => request.cost,
  });
  const response = createResponse();
  let allowed = 0;

  limiter({ user: { id: "user-1" }, cost: 2 }, response, () => { allowed += 1; });
  limiter({ user: { id: "user-1" }, cost: 1 }, response, () => { allowed += 1; });
  limiter({ user: { id: "user-1" }, cost: 1 }, response, () => { allowed += 1; });

  assert.equal(allowed, 2);
  assert.equal(response.statusCode, 429);
  assert.match(response.body.message, /Too many requests/);
  assert.ok(Number(response.headers["Retry-After"]) >= 1);
});
