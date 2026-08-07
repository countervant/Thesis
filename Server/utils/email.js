const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const EMAIL_REQUEST_TIMEOUT_MS = 15_000;

const getBrevoConfig = () => {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || "").trim();

  if (!apiKey || !senderEmail) {
    const error = new Error("Email service is not configured");
    error.status = 503;
    throw error;
  }

  return {
    apiKey,
    sender: {
      name: String(process.env.BREVO_SENDER_NAME || "CLIENTRA Security").trim(),
      email: senderEmail,
    },
  };
};

const sendEmail = async ({ to, subject, text, html }) => {
  const { apiKey, sender } = getBrevoConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      const providerMessage = String(details?.message || "").trim();
      const error = new Error(
        providerMessage
          ? `Brevo rejected the email: ${providerMessage}`
          : `Brevo rejected the email with status ${response.status}`
      );
      error.status = 502;
      throw error;
    }

    return response.json().catch(() => ({}));
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Email service timed out");
      timeoutError.status = 504;
      throw timeoutError;
    }

    if (!error.status) error.status = 502;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const sendTwoFactorCode = async ({ to, code, purpose = "login" }) => {
  const action = purpose === "enable" ? "enable two-factor authentication" : "finish signing in";
  return sendEmail({
    to,
    subject: "Your CLIENTRA verification code",
    text: `Your CLIENTRA verification code is ${code}. It expires in 5 minutes.`,
    html: `
      <div style="margin:0;background:#f7f7fb;padding:36px 16px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#172033">
        <div style="max-width:520px;margin:auto;background:#fff;border:1px solid #f1d8ec;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(35,20,55,.08)">
          <div style="height:6px;background:linear-gradient(90deg,#ec4899,#9333ea)"></div>
          <div style="padding:36px;text-align:center">
            <div style="display:inline-block;border-radius:16px;background:#fdf2f8;padding:12px 16px;color:#c0268d;font-weight:800">CLIENTRA Security</div>
            <h1 style="margin:24px 0 8px;font-size:24px">Verify your identity</h1>
            <p style="margin:0;color:#64748b;line-height:1.6">Use this one-time code to ${action}.</p>
            <div style="margin:26px auto;padding:17px 22px;border:1px solid #ead7f7;border-radius:14px;background:#faf5ff;font-size:32px;font-weight:800;letter-spacing:9px">${code}</div>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">This code expires in 5 minutes and can only be used once. If you did not request it, change your password immediately.</p>
          </div>
        </div>
      </div>`,
  });
};

export const sendPasswordResetCode = async ({ to, code }) =>
  sendEmail({
    to,
    subject: "Your CLIENTRA password reset code",
    text: `Your CLIENTRA password reset code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f7fb;padding:32px 16px">
        <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,.06);text-align:center">
          <div style="display:inline-block;padding:10px 14px;border-radius:14px;background:linear-gradient(135deg,#ff72a1,#8c6ff0);color:#fff;font-weight:700;letter-spacing:.5px">Reset Request</div>
          <h1 style="color:#1f2937;font-size:22px;margin:20px 0 8px">Here is your OTP</h1>
          <p style="color:#4b5563;font-size:15px">Use this one-time code to reset your password. It expires in 10 minutes.</p>
          <div style="display:inline-block;margin:18px 0 24px;letter-spacing:6px;font-size:30px;font-weight:800;color:#111827;background:#f5f3ff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 24px">${code}</div>
          <p style="color:#6b7280;font-size:13px">If you did not request this, you can ignore this email.</p>
          <p style="color:#9ca3af;font-size:12px">This is an automated message. Please do not reply.</p>
        </div>
      </div>`,
  });
