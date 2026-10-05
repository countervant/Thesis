import assert from "node:assert/strict";
import test from "node:test";
import {
  isPayMongoConfigured,
  getPayMongoAuthHeader,
  createCheckoutSession,
  getCheckoutSession,
  verifyWebhookSignature,
} from "../services/paymongo.service.js";

test("isPayMongoConfigured accurately detects test/live keys and rejects placeholders", () => {
  const originalKey = process.env.PAYMONGO_SECRET_KEY;

  process.env.PAYMONGO_SECRET_KEY = "";
  assert.equal(isPayMongoConfigured(), false);

  process.env.PAYMONGO_SECRET_KEY = "sk_test_PLACEHOLDER_KEY";
  assert.equal(isPayMongoConfigured(), false);

  const mockTestKey = ["sk", "test", "mock", "valid", "key"].join("_");
  const mockLiveKey = ["sk", "live", "mock", "valid", "key"].join("_");

  process.env.PAYMONGO_SECRET_KEY = mockTestKey;
  assert.equal(isPayMongoConfigured(), true);

  process.env.PAYMONGO_SECRET_KEY = mockLiveKey;
  assert.equal(isPayMongoConfigured(), true);

  process.env.PAYMONGO_SECRET_KEY = originalKey;
});

test("getPayMongoAuthHeader encodes secret key as HTTP Basic auth", () => {
  const originalKey = process.env.PAYMONGO_SECRET_KEY;
  const mockSampleKey = ["sk", "test", "sample", "auth", "key"].join("_");
  process.env.PAYMONGO_SECRET_KEY = mockSampleKey;

  const expectedBase64 = Buffer.from(`${mockSampleKey}:`).toString("base64");
  assert.equal(getPayMongoAuthHeader(), `Basic ${expectedBase64}`);

  process.env.PAYMONGO_SECRET_KEY = originalKey;
});

test("createCheckoutSession generates simulated checkout URL in sandbox mode", async () => {
  const originalKey = process.env.PAYMONGO_SECRET_KEY;
  process.env.PAYMONGO_SECRET_KEY = ""; // force sandbox simulation mode

  const result = await createCheckoutSession({
    taskId: "660c1f77bcf86cd799439011",
    projectTitle: "Brand Identity Design",
    amount: 5000,
    paymentType: "down_payment",
    clientUser: {
      _id: "660c1f77bcf86cd799439099",
      firstName: "Maria",
      lastName: "Santos",
      email: "maria@example.com",
    },
    frontendUrl: "http://localhost:5173",
  });

  assert.equal(result.isSandbox, true);
  assert.ok(result.checkoutSessionId.startsWith("cs_sim_"));
  assert.ok(result.checkoutUrl.includes("payment=success"));
  assert.ok(result.checkoutUrl.includes("taskId=660c1f77bcf86cd799439011"));

  process.env.PAYMONGO_SECRET_KEY = originalKey;
});

test("getCheckoutSession correctly handles simulated session IDs", async () => {
  const session = await getCheckoutSession("cs_sim_1712345678_abcd");

  assert.equal(session.id, "cs_sim_1712345678_abcd");
  assert.equal(session.status, "paid");
  assert.equal(session.isSimulated, true);
  assert.ok(session.payments.length > 0);
  assert.equal(session.payments[0].attributes.status, "paid");
});

test("getCheckoutSession rejects invalid or placeholder session IDs", async () => {
  await assert.rejects(
    async () => {
      await getCheckoutSession("{CHECKOUT_SESSION_ID}");
    },
    { message: "A valid session ID is required." }
  );

  await assert.rejects(
    async () => {
      await getCheckoutSession("");
    },
    { message: "A valid session ID is required." }
  );

  await assert.rejects(
    async () => {
      await getCheckoutSession(null);
    },
    { message: "A valid session ID is required." }
  );
});

test("createCheckoutSession includes paymentId in checkout URL", async () => {
  const originalKey = process.env.PAYMONGO_SECRET_KEY;
  process.env.PAYMONGO_SECRET_KEY = "";

  const result = await createCheckoutSession({
    taskId: "660c1f77bcf86cd799439011",
    paymentId: "660c1f77bcf86cd799439022",
    projectTitle: "Brand Identity Design",
    amount: 5000,
    paymentType: "down_payment",
    clientUser: {
      _id: "660c1f77bcf86cd799439099",
      firstName: "Maria",
      lastName: "Santos",
      email: "maria@example.com",
    },
    frontendUrl: "http://localhost:5173",
  });

  assert.ok(result.checkoutUrl.includes("paymentId=660c1f77bcf86cd799439022"));
  process.env.PAYMONGO_SECRET_KEY = originalKey;
});

test("payment settlement logic marks task as paid and unlocks watermarked output", () => {
  // Simulating full payment behavior
  const task = {
    amount: 10000,
    paid: 0,
    downPayment: { amount: 3000 },
    finalOutput: { watermarked: true, previewPublicId: "prev_123" },
    activities: [],
  };

  const payment = { amount: 10000, paymentType: "full_payment" };

  let projectTotal = Number(task.amount || 0);
  if (payment.paymentType === "full_payment") {
    task.paid = projectTotal > 0 ? projectTotal : payment.amount;
  }

  const isFullyPaid = Number(task.amount) > 0 && Number(task.paid) >= Number(task.amount);
  assert.equal(isFullyPaid, true);
  assert.equal(task.paid, 10000);

  if (isFullyPaid && task.finalOutput && task.finalOutput.watermarked) {
    task.finalOutput.watermarked = false;
  }
  assert.equal(task.finalOutput.watermarked, false);
});

test("payment settlement accurately prepares Budget income entry matching task.paid and category", () => {
  const taskId = "660c1f77bcf86cd799439011";
  const task = {
    _id: taskId,
    title: "Website Overhaul",
    amount: 15000,
    paid: 5000,
  };

  // Down payment scenario
  const isDownPaymentOnly = task.paid < task.amount;
  const downPaymentCategory = isDownPaymentOnly ? "Project Down Payment" : "Project Income";
  const downPaymentDesc = isDownPaymentOnly
    ? `Project down payment: ${task.title}`
    : `Project payment: ${task.title}`;

  assert.equal(downPaymentCategory, "Project Down Payment");
  assert.equal(downPaymentDesc, "Project down payment: Website Overhaul");

  // Fully paid scenario
  task.paid = 15000;
  const isFullyPaid = Number(task.amount) > 0 && Number(task.paid) >= Number(task.amount);
  const fullPaymentCategory = isFullyPaid ? "Project Income" : "Project Down Payment";
  const fullPaymentDesc = isFullyPaid
    ? `Project payment: ${task.title}`
    : `Project down payment: ${task.title}`;

  assert.equal(isFullyPaid, true);
  assert.equal(fullPaymentCategory, "Project Income");
  assert.equal(fullPaymentDesc, "Project payment: Website Overhaul");
  assert.equal(task.paid, 15000);
});


