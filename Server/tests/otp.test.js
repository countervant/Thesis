import assert from "node:assert/strict";
import test from "node:test";

import { hashOtp, hashPasswordResetOtp, verifyOtpHash } from "../utils/otp.js";

test("password-reset OTPs use a keyed, domain-separated hash", () => {
  const previousSecret = process.env.OTP_HASH_SECRET;
  process.env.OTP_HASH_SECRET = "test-only-otp-secret";

  try {
    const code = "123456";
    const resetHash = hashPasswordResetOtp(code);

    assert.notEqual(resetHash, hashOtp(code));
    assert.equal(resetHash.length, 64);
    assert.equal(resetHash.includes(code), false);
    assert.equal(verifyOtpHash(code, resetHash), false);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.OTP_HASH_SECRET;
    } else {
      process.env.OTP_HASH_SECRET = previousSecret;
    }
  }
});
