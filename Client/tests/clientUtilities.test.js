import assert from "node:assert/strict";
import test from "node:test";

import { escapeCsvCell } from "../src/utils/csvExport.js";
import { getPasswordValidationMessage } from "../src/utils/passwordValidation.js";

test("CSV exports neutralize spreadsheet formulas and escape quotes", () => {
  assert.equal(escapeCsvCell("=HYPERLINK(\"https://example.com\")"),
    "\"'=HYPERLINK(\"\"https://example.com\"\")\"");
  assert.equal(escapeCsvCell("Client \"A\""), "\"Client \"\"A\"\"\"");
  assert.equal(escapeCsvCell("Normal value"), "\"Normal value\"");
});

test("password validation matches the account security policy", () => {
  assert.match(getPasswordValidationMessage("Short1"), /at least 8/);
  assert.match(getPasswordValidationMessage("lowercase1"), /uppercase, lowercase, and number/);
  assert.match(getPasswordValidationMessage(`StrongPass1${"x".repeat(72)}`), /72 bytes or fewer/);
  assert.equal(getPasswordValidationMessage("StrongPass1"), "");
});
