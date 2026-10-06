import assert from "node:assert/strict";
import test from "node:test";
import { previewExternalProjectExtraction, commitProject } from "../controllers/chatProject.controller.js";
import { formatChatTranscript } from "../services/chatExtraction.service.js";

test("previewExternalProjectExtraction rejects empty or insufficient transcript (< 10 chars)", async () => {
  let responseStatus = 0;
  let responseBody = null;
  const res = {
    status(s) {
      responseStatus = s;
      return this;
    },
    json(b) {
      responseBody = b;
      return this;
    },
  };

  const req = {
    body: { transcript: "hi" },
  };

  await previewExternalProjectExtraction(req, res);

  assert.equal(responseStatus, 400);
  assert.equal(responseBody.success, false);
  assert.match(responseBody.message, /at least 10 characters/i);
});

test("formatChatTranscript handles formatted strings and structured message objects", () => {
  const plainText = "Hello client, here is the proposal.";
  assert.equal(formatChatTranscript(plainText), plainText);

  const mockMessages = [
    {
      senderName: "Alice",
      text: "We need a dashboard redesign.",
      createdAt: "2026-10-06T10:00:00Z",
    },
    {
      senderName: "Bob",
      text: "Sure, budget is ₱50,000.",
      createdAt: "2026-10-06T10:05:00Z",
    },
  ];

  const formatted = formatChatTranscript(mockMessages);
  assert.match(formatted, /Alice: We need a dashboard redesign/);
  assert.match(formatted, /Bob: Sure, budget is ₱50,000/);
});

test("commitProject rejects missing project name or empty tasks list", async () => {
  let responseStatus = 0;
  let responseBody = null;
  const res = {
    status(s) {
      responseStatus = s;
      return this;
    },
    json(b) {
      responseBody = b;
      return this;
    },
  };

  // Missing project name
  await commitProject({ params: {}, body: { projectName: "", tasks: [{ title: "Task 1" }] } }, res);
  assert.equal(responseStatus, 400);
  assert.equal(responseBody.success, false);
  assert.match(responseBody.message, /Project name is required/i);

  // Missing tasks
  await commitProject({ params: {}, body: { projectName: "Test Project", tasks: [] } }, res);
  assert.equal(responseStatus, 400);
  assert.equal(responseBody.success, false);
  assert.match(responseBody.message, /At least one backlog task is required/i);
});
