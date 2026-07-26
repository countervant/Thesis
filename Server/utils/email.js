import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    const error = new Error("Email service is not configured");
    error.status = 503;
    throw error;
  }

  transporter ||= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });
  return transporter;
};

export const sendTwoFactorCode = async ({ to, code, purpose = "login" }) => {
  const action = purpose === "enable" ? "enable two-factor authentication" : "finish signing in";
  return getTransporter().sendMail({
    from: `CLIENTRA Security <${process.env.GMAIL_USER}>`,
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
