import assert from "node:assert/strict";
import test from "node:test";

import { validateObjectIdParam } from "../middleware/validateObjectId.js";

test("object-id route parameters reject malformed values before database queries", () => {
  let nextCalled = false;
  let responseStatus = 0;
  let responseBody = null;
  const response = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  validateObjectIdParam({}, response, () => { nextCalled = true; }, "not-an-object-id");

  assert.equal(nextCalled, false);
  assert.equal(responseStatus, 400);
  assert.deepEqual(responseBody, { message: "Invalid resource id" });
});

test("object-id route parameters allow valid values", () => {
  let nextCalled = false;

  validateObjectIdParam(
    {},
    {},
    () => { nextCalled = true; },
    "507f1f77bcf86cd799439011"
  );

  assert.equal(nextCalled, true);
});
