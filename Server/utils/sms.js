const twilioCredentials = () => ({
  accountSid: String(process.env.TWILIO_ACCOUNT_SID || "").trim(),
  authToken: String(process.env.TWILIO_AUTH_TOKEN || "").trim(),
  from: String(process.env.TWILIO_PHONE_NUMBER || "").trim(),
  messagingServiceSid: String(process.env.TWILIO_MESSAGING_SERVICE_SID || "").trim(),
});

export const sendPhoneVerificationCode = async ({ to, code }) => {
  const credentials = twilioCredentials();
  const hasSender = credentials.from || credentials.messagingServiceSid;
  const configured = credentials.accountSid && credentials.authToken && hasSender;

  if (!configured) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[sms:development] Recovery phone verification code for ${to}: ${code}`);
      return { developmentCode: code, provider: "development" };
    }
    const error = new Error("SMS verification is not configured. Add the Twilio credentials to the server environment.");
    error.status = 503;
    throw error;
  }

  const body = new URLSearchParams({
    To: to,
    Body: `Your CLIENTRA recovery phone verification code is ${code}. It expires in 5 minutes.`,
  });
  if (credentials.messagingServiceSid) {
    body.set("MessagingServiceSid", credentials.messagingServiceSid);
  } else {
    body.set("From", credentials.from);
  }

  const authorization = Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(credentials.accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result.message || "Unable to send the SMS verification code.");
    error.status = 502;
    throw error;
  }

  const result = await response.json();
  return { messageSid: result.sid, provider: "twilio" };
};
