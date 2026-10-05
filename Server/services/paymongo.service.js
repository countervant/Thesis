import crypto from "node:crypto";
import https from "node:https";

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

/**
 * Checks whether valid PayMongo credentials are set in the environment.
 * Rejects empty strings, undefined, and placeholder defaults.
 *
 * @returns {boolean}
 */
export const isPayMongoConfigured = () => {
  const secretKey = String(process.env.PAYMONGO_SECRET_KEY || "").trim();
  if (!secretKey) return false;
  if (secretKey.includes("PLACEHOLDER") || secretKey === "sk_test_..." || secretKey === "sk_live_...") {
    return false;
  }
  return secretKey.startsWith("sk_test_") || secretKey.startsWith("sk_live_");
};

/**
 * Generates HTTP Basic Auth header value for PayMongo requests.
 * PayMongo requires the secret key base64-encoded as the username with no password.
 *
 * @returns {string}
 */
export const getPayMongoAuthHeader = () => {
  const secretKey = String(process.env.PAYMONGO_SECRET_KEY || "").trim();
  const token = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${token}`;
};

/**
 * Reliable IPv4 HTTPS request helper for PayMongo API to avoid
 * Windows undici dual-stack connect timeouts.
 */
const paymongoHttpRequest = ({ path, method = "GET", body = null, headers = {} }) =>
  new Promise((resolve, reject) => {
    const url = new URL(`${PAYMONGO_API_BASE}${path}`);
    const postData = body ? JSON.stringify(body) : null;
    const requestHeaders = {
      Authorization: getPayMongoAuthHeader(),
      Accept: "application/json",
      ...headers,
    };
    if (postData) {
      requestHeaders["Content-Type"] = "application/json";
      requestHeaders["Content-Length"] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}${url.search}`,
      method,
      headers: requestHeaders,
      family: 4,
      timeout: 25000,
    };

    const req = https.request(options, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = responseBody ? JSON.parse(responseBody) : {};
        } catch {
          parsed = { raw: responseBody };
        }
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          data: parsed,
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("PayMongo request timed out after 25 seconds"));
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });

/**
 * Creates a PayMongo Checkout Session for a task payment.
 *
 * @param {Object} options
 * @param {string} options.taskId - The MongoDB Task ID.
 * @param {string} options.projectTitle - Title of the project.
 * @param {number} options.amount - Amount in Philippine Pesos (PHP).
 * @param {"down_payment"|"remaining_balance"|"full_payment"} options.paymentType
 * @param {Object} [options.clientUser] - Information about the client making payment.
 * @param {string} [options.frontendUrl] - Base URL of the client application.
 * @returns {Promise<{ checkoutUrl: string, checkoutSessionId: string, isSandbox: boolean }>}
 */
export const createCheckoutSession = async ({
  taskId,
  paymentId = "",
  projectTitle,
  amount,
  paymentType,
  clientUser = {},
  frontendUrl = "",
}) => {
  const numericAmount = Math.max(1, Number(amount) || 0);
  const amountInCentavos = Math.round(numericAmount * 100);

  const baseFrontendUrl =
    frontendUrl ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173";

  const paymentLabels = {
    down_payment: "Required Down Payment",
    remaining_balance: "Remaining Project Balance",
    full_payment: "Full Project Payment",
  };

  const lineItemName = `${projectTitle || "Project"} - ${paymentLabels[paymentType] || "Payment"}`;

  if (isPayMongoConfigured()) {
    const successUrl = `${baseFrontendUrl}/client/dashboard?page=projects&payment=success&taskId=${taskId}${paymentId ? `&paymentId=${paymentId}` : ""}`;
    const cancelUrl = `${baseFrontendUrl}/client/dashboard?page=projects&payment=cancelled&taskId=${taskId}${paymentId ? `&paymentId=${paymentId}` : ""}`;

    const payload = {
      data: {
        attributes: {
          billing: {
            name:
              [clientUser?.firstName, clientUser?.lastName].filter(Boolean).join(" ") ||
              clientUser?.companyName ||
              "Client",
            email: clientUser?.email || "client@clientra.me",
            phone: clientUser?.phone || "09170000000",
          },
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          description: `Payment for ${projectTitle || "Project"} (${paymentLabels[paymentType] || "Payment"})`,
          line_items: [
            {
              currency: "PHP",
              amount: amountInCentavos,
              name: lineItemName.slice(0, 100),
              quantity: 1,
            },
          ],
          payment_method_types: [
            "qrph",
            "card",
            "gcash",
            "paymaya",
            "grab_pay",
            "dob",
            "billease",
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            taskId: String(taskId),
            paymentType,
            amount: String(numericAmount),
            clientId: String(clientUser?._id || ""),
          },
        },
      },
    };

    const { ok, status, data } = await paymongoHttpRequest({
      path: "/checkout_sessions",
      method: "POST",
      body: payload,
    });

    if (!ok) {
      const errorMsg =
        data?.errors?.[0]?.detail ||
        data?.message ||
        `PayMongo API error (${status})`;
      console.error("[PayMongo] Checkout Session creation failed:", data);
      throw new Error(`PayMongo: ${errorMsg}`);
    }

    const session = data?.data;
    return {
      checkoutUrl: session.attributes.checkout_url,
      checkoutSessionId: session.id,
      isSandbox: false,
    };
  }

  // Graceful Local / Development Sandbox Simulation Mode when keys aren't yet active in .env
  console.info(
    "[PayMongo] Operating in simulated sandbox mode (no valid PAYMONGO_SECRET_KEY set in .env)"
  );
  const simulatedId = `cs_sim_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const simulatedCheckoutUrl = `${baseFrontendUrl}/client/dashboard?page=projects&payment=success&taskId=${taskId}&session_id=${simulatedId}&simulated=true${paymentId ? `&paymentId=${paymentId}` : ""}`;

  return {
    checkoutUrl: simulatedCheckoutUrl,
    checkoutSessionId: simulatedId,
    isSandbox: true,
  };
};

/**
 * Fetches a Checkout Session by its session ID from PayMongo or simulated store.
 *
 * @param {string} sessionId - PayMongo Checkout Session ID.
 * @returns {Promise<Object>}
 */
export const getCheckoutSession = async (sessionId) => {
  if (
    !sessionId ||
    typeof sessionId !== "string" ||
    sessionId.trim() === "" ||
    sessionId === "{CHECKOUT_SESSION_ID}"
  ) {
    throw new Error("A valid session ID is required.");
  }

  // Simulated session handler
  if (sessionId.startsWith("cs_sim_")) {
    return {
      id: sessionId,
      status: "paid",
      payments: [
        {
          id: `pay_sim_${Date.now()}`,
          attributes: {
            status: "paid",
            source: { type: "gcash (sandbox)" },
            paid_at: Math.floor(Date.now() / 1000),
          },
        },
      ],
      isSimulated: true,
    };
  }

  if (!isPayMongoConfigured()) {
    throw new Error("PayMongo credentials are not configured.");
  }

  const { ok, status, data } = await paymongoHttpRequest({
    path: `/checkout_sessions/${sessionId}`,
    method: "GET",
  });

  if (!ok) {
    const errorMsg =
      data?.errors?.[0]?.detail ||
      data?.message ||
      `PayMongo API error (${status})`;
    throw new Error(`PayMongo: ${errorMsg}`);
  }

  return {
    id: data?.data?.id,
    status: data?.data?.attributes?.status,
    payments: data?.data?.attributes?.payments || [],
    paymentIntent: data?.data?.attributes?.payment_intent,
    raw: data?.data,
  };
};

/**
 * Verifies PayMongo Webhook signature using HMAC-SHA256.
 *
 * @param {string} rawBody - Raw unparsed request body string.
 * @param {string} signatureHeader - Value of 'paymongo-signature' HTTP header.
 * @returns {boolean}
 */
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // If webhook secret isn't configured in development, allow requests through
    return true;
  }

  if (!signatureHeader) return false;

  try {
    const parts = signatureHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const testSigPart = parts.find((p) => p.startsWith("te="));
    const liveSigPart = parts.find((p) => p.startsWith("li="));

    const timestamp = timestampPart ? timestampPart.slice(2) : "";
    const signature = liveSigPart ? liveSigPart.slice(3) : testSigPart ? testSigPart.slice(3) : "";

    if (!timestamp || !signature) return false;

    const payloadToSign = `${timestamp}.${rawBody}`;
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(payloadToSign)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch (err) {
    console.error("[PayMongo] Webhook signature verification error:", err);
    return false;
  }
};

