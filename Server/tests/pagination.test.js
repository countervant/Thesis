import assert from "node:assert/strict";
import test from "node:test";

import { getPagination, pagedResponse } from "../utils/pagination.js";

test("getPagination applies defaults and derives the page offset", () => {
  assert.deepEqual(getPagination(), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(getPagination({ page: "3", limit: "25" }), {
    page: 3,
    limit: 25,
    skip: 50,
  });
});

test("getPagination clamps untrusted page and limit values", () => {
  assert.deepEqual(getPagination({ page: "-4", limit: "-10" }), {
    page: 1,
    limit: 1,
    skip: 0,
  });
  assert.deepEqual(getPagination({ page: "0", limit: "500" }), {
    page: 1,
    limit: 100,
    skip: 0,
  });
  assert.deepEqual(getPagination({ page: "invalid", limit: "invalid" }), {
    page: 1,
    limit: 20,
    skip: 0,
  });
});

test("getPagination honors controlled custom defaults", () => {
  assert.deepEqual(
    getPagination({ page: "2", limit: "80" }, { defaultLimit: 10, maxLimit: 50 }),
    { page: 2, limit: 50, skip: 50 }
  );
});

test("pagedResponse returns exact totals and custom collection metadata", () => {
  const tasks = [{ _id: "task-1" }, { _id: "task-2" }];

  assert.deepEqual(
    pagedResponse({ data: tasks, page: 2, limit: 20, total: 41, key: "tasks" }),
    {
      tasks,
      page: 2,
      limit: 20,
      total: 41,
      totalPages: 3,
    }
  );
  assert.equal(pagedResponse({ data: [], page: 1, limit: 20, total: 0 }).totalPages, 1);
});
