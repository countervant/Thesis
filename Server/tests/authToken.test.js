import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseSetupOnlyTokenForPath,
  wasTokenIssuedBeforePasswordChange,
} from "../middleware/protectedjwt.js";

test("password changes revoke older tokens without rejecting same-second logins", () => {
  const passwordChangedAt = new Date("2026-08-13T10:00:00.750Z");
  const sameSecondIssuedAt = Math.floor(passwordChangedAt.getTime() / 1000);

  assert.equal(
    wasTokenIssuedBeforePasswordChange(sameSecondIssuedAt - 2, passwordChangedAt),
    true
  );
  assert.equal(
    wasTokenIssuedBeforePasswordChange(sameSecondIssuedAt, passwordChangedAt),
    false
  );
  assert.equal(wasTokenIssuedBeforePasswordChange(sameSecondIssuedAt, null), false);
});

test("malformed token issue times fail closed once a password change exists", () => {
  const passwordChangedAt = new Date("2026-08-13T10:00:00.000Z");

  assert.equal(
    wasTokenIssuedBeforePasswordChange(undefined, passwordChangedAt),
    true
  );
  assert.equal(
    wasTokenIssuedBeforePasswordChange("invalid", passwordChangedAt),
    true
  );
});

test("admin setup-only tokens are confined to two-factor enrollment routes", () => {
  assert.equal(canUseSetupOnlyTokenForPath(true, "/api/auth/2fa-status"), true);
  assert.equal(canUseSetupOnlyTokenForPath(true, "/api/auth/enable-2fa/request"), true);
  assert.equal(canUseSetupOnlyTokenForPath(true, "/api/auth/enable-2fa/verify"), true);
  assert.equal(canUseSetupOnlyTokenForPath(true, "/api/messages/events-ticket"), false);
  assert.equal(canUseSetupOnlyTokenForPath(true, "/api/tasks"), false);
  assert.equal(canUseSetupOnlyTokenForPath(false, "/api/tasks"), true);
});
